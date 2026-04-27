'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import { MediaViewerModal } from '@/components/media-viewer-modal';
import type { PostCardProps } from '@/components/post-card';
import { cn } from '@/lib/utils';
import { getListingDetailById } from '@/app/messages/_services/listings';
import {
  getConversations,
  openOrCreateConversationFromListing,
} from '@/services/messagingService';
import type {
  Conversation,
  Message,
  ReactionType,
  ReplyPreview,
} from '@/types/messaging';
import { useUser } from '@/utils/UserContext';

import MessageBubble from './_components/MessageBubble';
import { MessageEditModal } from './_components/MessageEditModal';
import { useMessageShell } from '../_components/MessageShellContext';
import {
  deleteConversation,
  deleteMessage,
  getConversation,
  getMessages,
  markConversationRead,
  reactToMessage,
  sendMessage,
} from './_services/conversation';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateSeparator(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getDate() - date.getDate();
  if (diff === 0 && now.getMonth() === date.getMonth()) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function getSystemActionLabel(content?: string): string | null {
  const raw = String(content ?? '').trim();
  const actionPrefixes = [
    '__OFFER_ACTION__:',
    '__DEAL_ACTION__:',
    '__SCHEDULE_ACTION__:',
    '__SOLD_ACTION__:',
  ];
  const matchedPrefix = actionPrefixes.find((prefix) => raw.startsWith(prefix));
  if (!matchedPrefix) {
    return null;
  }
  const actionText = raw.replace(matchedPrefix, '').trim();
  if (!actionText) {
    return null;
  }
  return actionText;
}

const DRAFT_CONVERSATION_ID = 'new';
const MESSAGE_PAGE_SIZE = 20;
const LOAD_OLDER_SCROLL_THRESHOLD = 96;

function splitSellerName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: 'Seller', lastName: 'User' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'Seller' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function toListingType(
  type: PostCardProps['type'],
): 'SELL' | 'RENT' | 'SERVICE' {
  if (type === 'rent') return 'RENT';
  if (type === 'service') return 'SERVICE';
  return 'SELL';
}

function toDraftConversation(listing: PostCardProps): Conversation {
  const seller = splitSellerName(listing.seller.name);
  return {
    id: DRAFT_CONVERSATION_ID,
    listing: {
      id: listing.id,
      title: listing.title,
      price: listing.price,
      priceUnit: listing.priceUnit,
      listingType: toListingType(listing.type),
      imageUrl: listing.imageUrl,
      status: 'ACTIVE',
    },
    otherParticipant: {
      id: listing.seller.id ?? '',
      firstName: seller.firstName,
      lastName: seller.lastName,
      isOnline: false,
    },
    unreadCount: 0,
    isSeller: false,
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { setShellState } = useMessageShell();
  const currentUserId = user?.userId ?? '';

  const conversationId =
    typeof params.conversationId === 'string' ? params.conversationId : '';
  const isDraftConversation = conversationId === DRAFT_CONVERSATION_ID;
  const draftListingId = (searchParams.get('listingId') ?? '').trim();

  const [showSkeleton, setShowSkeleton] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // ── Reply state ──────────────────────────────────────────────────────────
  const [replyTo, setReplyTo] = useState<ReplyPreview | null>(null);

  // ── Edit state ───────────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<{
    id: string;
    content: string;
  } | null>(null);
  const [mediaViewerIndex, setMediaViewerIndex] = useState<number | null>(null);
  const [animatedReadMarkerId, setAnimatedReadMarkerId] = useState<
    string | null
  >(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToBottomRef = useRef(false);
  const restoreScrollRef = useRef<{
    previousHeight: number;
    previousTop: number;
  } | null>(null);
  const bottomAnchorTimersRef = useRef<number[]>([]);

  const loadedMessageCount = messages.length;

  const clearBottomAnchorTimers = useCallback(() => {
    if (bottomAnchorTimersRef.current.length === 0) return;
    bottomAnchorTimersRef.current.forEach((timerId) =>
      window.clearTimeout(timerId),
    );
    bottomAnchorTimersRef.current = [];
  }, []);

  const forceScrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, []);

  const queueReliableBottomAnchor = useCallback(() => {
    clearBottomAnchorTimers();

    // Run multiple passes to handle delayed layout shifts (images/media sizing).
    forceScrollToBottom();
    requestAnimationFrame(() => forceScrollToBottom());
    requestAnimationFrame(() =>
      requestAnimationFrame(() => forceScrollToBottom()),
    );

    const timerA = window.setTimeout(() => forceScrollToBottom(), 90);
    const timerB = window.setTimeout(() => forceScrollToBottom(), 220);
    bottomAnchorTimersRef.current = [timerA, timerB];
  }, [clearBottomAnchorTimers, forceScrollToBottom]);

  const load = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    setMessages([]);
    setHasOlderMessages(false);
    setLoadingOlder(false);
    shouldScrollToBottomRef.current = false;
    restoreScrollRef.current = null;
    try {
      if (isDraftConversation) {
        if (!draftListingId) {
          setConversation(null);
          setMessages([]);
          setHasOlderMessages(false);
          return;
        }

        const existingConversations = await getConversations();
        const existingConversation = existingConversations.find(
          (item) => item.listing.id === draftListingId,
        );
        if (existingConversation) {
          router.replace(`/messages/${existingConversation.id}`);
          return;
        }

        const listingPayload = await getListingDetailById(draftListingId);
        setConversation(toDraftConversation(listingPayload.listing));
        setMessages([]);
        setHasOlderMessages(false);
        return;
      }

      const [conv, messagesPage] = await Promise.all([
        getConversation(conversationId),
        getMessages(conversationId, { limit: MESSAGE_PAGE_SIZE, offset: 0 }),
      ]);
      setConversation(conv);
      setMessages(messagesPage.messages);
      setHasOlderMessages(messagesPage.messages.length < messagesPage.total);
      shouldScrollToBottomRef.current = true;
      if (conv) {
        await markConversationRead(conversationId);
      }
    } catch {
      setConversation(null);
      setMessages([]);
      setHasOlderMessages(false);
    } finally {
      setLoading(false);
    }
  }, [conversationId, draftListingId, isDraftConversation, router]);

  useEffect(() => {
    load();
  }, [load]);

  // Delay skeleton so fast loads do not flicker.
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (loading) {
      // If loading is still in progress after 500ms, show skeleton.
      timer = setTimeout(() => setShowSkeleton(true), 250);
    } else {
      // Loading completed before/after threshold; hide skeleton.
      setShowSkeleton(false);
    }

    return () => clearTimeout(timer);
  }, [loading]);

  const effectiveCurrentUserId = useMemo(() => {
    if (currentUserId) return currentUserId;

    const otherUserId = conversation?.otherParticipant?.id ?? '';
    if (!otherUserId) return '';

    const mine = messages.find((msg) => msg.senderId !== otherUserId)?.senderId;
    return mine ?? '';
  }, [conversation?.otherParticipant?.id, currentUserId, messages]);

  const reloadLatestMessageSlice = useCallback(
    async (scrollToBottom = false) => {
      if (isDraftConversation || !conversationId) return;

      const latestLimit = Math.max(MESSAGE_PAGE_SIZE, loadedMessageCount);
      const page = await getMessages(conversationId, {
        limit: latestLimit,
        offset: 0,
      });

      if (scrollToBottom) {
        shouldScrollToBottomRef.current = true;
      }

      setMessages(page.messages);
      setHasOlderMessages(page.messages.length < page.total);
    },
    [conversationId, isDraftConversation, loadedMessageCount],
  );

  const loadOlderMessages = useCallback(async () => {
    if (
      loading ||
      loadingOlder ||
      !hasOlderMessages ||
      isDraftConversation ||
      !conversationId
    ) {
      return;
    }

    const container = messagesContainerRef.current;
    if (container) {
      restoreScrollRef.current = {
        previousHeight: container.scrollHeight,
        previousTop: container.scrollTop,
      };
    }

    setLoadingOlder(true);
    try {
      const page = await getMessages(conversationId, {
        limit: MESSAGE_PAGE_SIZE,
        offset: loadedMessageCount,
      });

      if (page.messages.length === 0) {
        restoreScrollRef.current = null;
        setHasOlderMessages(false);
        return;
      }

      const existingIds = new Set(messages.map((item) => item.id));
      const olderChunk = page.messages.filter(
        (item) => !existingIds.has(item.id),
      );

      if (olderChunk.length > 0) {
        setMessages((prev) => [...olderChunk, ...prev]);
      } else {
        restoreScrollRef.current = null;
      }

      const nextLoadedCount = loadedMessageCount + page.messages.length;
      setHasOlderMessages(nextLoadedCount < page.total);
    } finally {
      setLoadingOlder(false);
    }
  }, [
    conversationId,
    hasOlderMessages,
    isDraftConversation,
    loadedMessageCount,
    loading,
    loadingOlder,
    messages,
  ]);

  const handleMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || loading || loadingOlder || !hasOlderMessages) {
      return;
    }

    if (container.scrollTop <= LOAD_OLDER_SCROLL_THRESHOLD) {
      void loadOlderMessages();
    }
  }, [hasOlderMessages, loadOlderMessages, loading, loadingOlder]);

  useLayoutEffect(() => {
    if (loading) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    if (restoreScrollRef.current) {
      const { previousHeight, previousTop } = restoreScrollRef.current;
      restoreScrollRef.current = null;
      const nextHeight = container.scrollHeight;
      container.scrollTop = Math.max(
        0,
        nextHeight - previousHeight + previousTop,
      );
      return;
    }

    if (shouldScrollToBottomRef.current) {
      shouldScrollToBottomRef.current = false;
      queueReliableBottomAnchor();
    }
  }, [loading, messages, queueReliableBottomAnchor]);

  useEffect(() => {
    return () => {
      clearBottomAnchorTimers();
    };
  }, [clearBottomAnchorTimers]);

  useEffect(() => {
    if (isDraftConversation || !conversationId) return;

    const onRealtimeMessage = async (evt: Event) => {
      const custom = evt as CustomEvent<{ conversationId?: string }>;
      if (custom.detail?.conversationId !== conversationId) return;

      await reloadLatestMessageSlice(true);
      const freshConversation = await getConversation(conversationId);
      if (freshConversation) {
        setConversation(freshConversation);
      }
      await markConversationRead(conversationId);
    };

    window.addEventListener(
      'realtime:message',
      onRealtimeMessage as EventListener,
    );
    return () =>
      window.removeEventListener(
        'realtime:message',
        onRealtimeMessage as EventListener,
      );
  }, [conversationId, isDraftConversation, reloadLatestMessageSlice]);

  useEffect(() => {
    if (isDraftConversation || !conversationId) return;

    const onRealtimeReaction = async (evt: Event) => {
      const custom = evt as CustomEvent<{ conversationId?: string }>;
      if (custom.detail?.conversationId !== conversationId) return;

      await reloadLatestMessageSlice();
    };

    const onRealtimeStatus = (evt: Event) => {
      const custom = evt as CustomEvent<{
        conversationId?: string;
        messageId?: string;
        status?: Message['status'];
      }>;
      if (custom.detail?.conversationId !== conversationId) return;
      const targetMessageId = custom.detail?.messageId ?? '';
      const nextStatus = custom.detail?.status;
      if (!targetMessageId || !nextStatus) return;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === targetMessageId ? { ...msg, status: nextStatus } : msg,
        ),
      );
    };

    const onRealtimeRead = (evt: Event) => {
      const custom = evt as CustomEvent<{
        conversationId?: string;
        lastReadMessageId?: string;
      }>;
      if (custom.detail?.conversationId !== conversationId) return;

      const lastReadMessageId = (custom.detail?.lastReadMessageId ?? '').trim();
      if (!lastReadMessageId) return;

      setConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          otherLastReadMessageId: lastReadMessageId,
        };
      });

      setAnimatedReadMarkerId(lastReadMessageId);
      setMessages((prev) => {
        const targetMessage = prev.find((msg) => msg.id === lastReadMessageId);
        if (!targetMessage) return prev;

        const targetTime = new Date(targetMessage.createdAt).getTime();
        return prev.map((msg) => {
          if (msg.senderId !== effectiveCurrentUserId) return msg;
          if (new Date(msg.createdAt).getTime() <= targetTime) {
            return { ...msg, status: 'READ' };
          }
          return msg;
        });
      });
    };

    const onRealtimeMessageEdit = (evt: Event) => {
      const custom = evt as CustomEvent<{
        conversationId?: string;
        messageId?: string;
        content?: string;
        isEdited?: boolean;
      }>;
      if (custom.detail?.conversationId !== conversationId) return;

      const messageId = custom.detail?.messageId ?? '';
      if (!messageId) return;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content: custom.detail?.content ?? msg.content,
                isEdited: custom.detail?.isEdited ?? true,
              }
            : msg,
        ),
      );
    };

    const onRealtimeMessageUnsend = (evt: Event) => {
      const custom = evt as CustomEvent<{
        conversationId?: string;
        messageId?: string;
        isUnsent?: boolean;
      }>;
      if (custom.detail?.conversationId !== conversationId) return;

      const messageId = custom.detail?.messageId ?? '';
      if (!messageId) return;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                isUnsent: custom.detail?.isUnsent ?? true,
                content: undefined,
                attachments: [],
                reactions: [],
              }
            : msg,
        ),
      );

      setConversation((prev) => {
        if (!prev) return prev;
        if (prev.otherLastReadMessageId !== messageId) return prev;
        return {
          ...prev,
          otherLastReadMessageId: undefined,
        };
      });
    };

    const onRealtimeListingStatus = (evt: Event) => {
      const custom = evt as CustomEvent<{
        listingId?: string;
        status?: string;
      }>;
      const listingId = (custom.detail?.listingId ?? '').trim();
      const status = (custom.detail?.status ?? '').trim().toUpperCase();
      if (!listingId || !status) return;

      setConversation((prev) => {
        if (!prev || prev.listing.id !== listingId) return prev;
        return {
          ...prev,
          listing: {
            ...prev.listing,
            status,
          },
        };
      });
    };

    const onRealtimeDealUpdated = async (evt: Event) => {
      const custom = evt as CustomEvent<{ conversationId?: string }>;
      if (custom.detail?.conversationId !== conversationId) return;

      const [freshConversation] = await Promise.all([
        getConversation(conversationId),
        reloadLatestMessageSlice(),
      ]);

      if (freshConversation) {
        setConversation(freshConversation);
      }
    };

    window.addEventListener(
      'realtime:reaction',
      onRealtimeReaction as EventListener,
    );
    window.addEventListener(
      'realtime:status',
      onRealtimeStatus as EventListener,
    );
    window.addEventListener('realtime:read', onRealtimeRead as EventListener);
    window.addEventListener(
      'realtime:message-edit',
      onRealtimeMessageEdit as EventListener,
    );
    window.addEventListener(
      'realtime:message-unsend',
      onRealtimeMessageUnsend as EventListener,
    );
    window.addEventListener(
      'realtime:listing-status',
      onRealtimeListingStatus as EventListener,
    );
    window.addEventListener(
      'realtime:deal-updated',
      onRealtimeDealUpdated as EventListener,
    );

    return () => {
      window.removeEventListener(
        'realtime:reaction',
        onRealtimeReaction as EventListener,
      );
      window.removeEventListener(
        'realtime:status',
        onRealtimeStatus as EventListener,
      );
      window.removeEventListener(
        'realtime:read',
        onRealtimeRead as EventListener,
      );
      window.removeEventListener(
        'realtime:message-edit',
        onRealtimeMessageEdit as EventListener,
      );
      window.removeEventListener(
        'realtime:message-unsend',
        onRealtimeMessageUnsend as EventListener,
      );
      window.removeEventListener(
        'realtime:listing-status',
        onRealtimeListingStatus as EventListener,
      );
      window.removeEventListener(
        'realtime:deal-updated',
        onRealtimeDealUpdated as EventListener,
      );
    };
  }, [
    conversationId,
    effectiveCurrentUserId,
    isDraftConversation,
    reloadLatestMessageSlice,
  ]);

  useEffect(() => {
    const onPresenceUpdate = (evt: Event) => {
      const custom = evt as CustomEvent<{
        userId?: string;
        isOnline?: boolean;
      }>;
      const updatedUserId = custom.detail?.userId ?? '';
      const isOnline = Boolean(custom.detail?.isOnline);

      setConversation((prev) => {
        if (!prev || prev.otherParticipant.id !== updatedUserId) return prev;
        return {
          ...prev,
          otherParticipant: {
            ...prev.otherParticipant,
            isOnline,
          },
        };
      });
    };

    window.addEventListener(
      'realtime:presence',
      onPresenceUpdate as EventListener,
    );
    return () =>
      window.removeEventListener(
        'realtime:presence',
        onPresenceUpdate as EventListener,
      );
  }, []);

  useEffect(() => {
    if (!animatedReadMarkerId) return;

    const timer = setTimeout(() => {
      setAnimatedReadMarkerId(null);
    }, 900);

    return () => clearTimeout(timer);
  }, [animatedReadMarkerId]);

  const mediaItems = useMemo(
    () =>
      messages.flatMap((msg) =>
        (msg.attachments ?? []).filter(
          (att) => att.fileType === 'IMAGE' || att.fileType === 'VIDEO',
        ),
      ),
    [messages],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (
      content: string,
      attachments: Array<{ name: string; mimeType: string; data: string }>,
    ) => {
      if (sending) return;
      if (conversation?.canSendMessage === false) {
        throw new Error('Recipient is unavailable.');
      }
      setSending(true);
      try {
        let targetConversationId = conversationId;
        if (isDraftConversation) {
          if (!draftListingId) {
            throw new Error('Listing is required to start a conversation.');
          }

          targetConversationId =
            await openOrCreateConversationFromListing(draftListingId);
          const freshConversation = await getConversation(targetConversationId);
          if (freshConversation) {
            setConversation(freshConversation);
          }
          router.replace(`/messages/${targetConversationId}`);
        }

        const newMsg = await sendMessage(
          targetConversationId,
          content,
          attachments,
          replyTo,
        );
        shouldScrollToBottomRef.current = true;
        setMessages((prev) => [...prev, newMsg]);
        setReplyTo(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to send message.';
        toast.error(message, { position: 'top-center' });
        throw err;
      } finally {
        setSending(false);
      }
    },
    [
      sending,
      conversation,
      conversationId,
      isDraftConversation,
      draftListingId,
      replyTo,
      router,
    ],
  );

  const handleReply = (msg: Message) => {
    const senderName =
      msg.senderId === effectiveCurrentUserId
        ? 'You'
        : conversation?.otherParticipant
          ? `${conversation.otherParticipant.firstName}`
          : 'Them';

    let contentPreview = msg.content ?? '';
    if (!contentPreview) {
      const atts = msg.attachments ?? [];
      const imgs = atts.filter((a) => a.fileType === 'IMAGE').length;
      const vids = atts.filter((a) => a.fileType === 'VIDEO').length;
      const parts: string[] = [];
      if (imgs) parts.push(`📷 ${imgs > 1 ? `${imgs} photos` : 'Photo'}`);
      if (vids) parts.push(`🎥 ${vids > 1 ? `${vids} videos` : 'Video'}`);
      contentPreview = parts.join(', ');
    }

    setReplyTo({
      messageId: msg.id,
      senderId: msg.senderId,
      senderName,
      contentPreview,
    });
  };

  const handleReact = async (
    messageId: string,
    reaction: ReactionType | null,
  ) => {
    await reactToMessage(
      conversationId,
      messageId,
      effectiveCurrentUserId,
      reaction,
    );
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const existing = (m.reactions ?? []).filter(
          (r) => r.userId !== effectiveCurrentUserId,
        );
        return {
          ...m,
          reactions: reaction
            ? [...existing, { userId: effectiveCurrentUserId, type: reaction }]
            : existing,
        };
      }),
    );
  };

  const handleEdit = (messageId: string, currentContent: string) => {
    setEditTarget({ id: messageId, content: currentContent });
  };

  const handleEditSave = async (newContent: string) => {
    if (!editTarget) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === editTarget.id
          ? { ...m, content: newContent, isEdited: true }
          : m,
      ),
    );
    setEditTarget(null);
  };

  const handleDelete = async (messageId: string, unsend: boolean) => {
    await deleteMessage(conversationId, messageId, unsend);
    if (unsend) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, isUnsent: true, content: undefined, attachments: [] }
            : m,
        ),
      );
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  };

  const handleDeleteConversation = useCallback(async () => {
    if (isDraftConversation) {
      router.push('/messages');
      return;
    }

    await deleteConversation(conversationId);
    router.push('/messages');
  }, [conversationId, isDraftConversation, router]);

  const handleOpenMediaViewer = (attachmentId: string) => {
    const idx = mediaItems.findIndex((item) => item.id === attachmentId);
    if (idx >= 0) {
      setMediaViewerIndex(idx);
    }
  };

  const handleOfferUpdated = useCallback(async () => {
    if (isDraftConversation || !conversationId) return;

    const [freshConversation] = await Promise.all([
      getConversation(conversationId),
      reloadLatestMessageSlice(),
    ]);

    if (freshConversation) {
      setConversation(freshConversation);
    }
    await markConversationRead(conversationId);
  }, [conversationId, isDraftConversation, reloadLatestMessageSlice]);

  const handleMarkedComplete = useCallback(async () => {
    await handleOfferUpdated();
  }, [handleOfferUpdated]);

  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  useEffect(() => {
    if (conversation) {
      setShellState((prev) => ({
        ...prev,
        conversation,
      }));
      return;
    }

    if (!loading) {
      setShellState((prev) => ({
        ...prev,
        conversation: null,
      }));
    }
  }, [conversation, loading, setShellState]);

  useEffect(() => {
    setShellState((prev) => ({
      ...prev,
      onDelete: handleDeleteConversation,
      onMarkedComplete: handleMarkedComplete,
      onOfferUpdated: handleOfferUpdated,
      onSend: handleSend,
      inputDisabled:
        loading ||
        sending ||
        !conversation ||
        conversation.canSendMessage === false,
      replyTo,
      onCancelReply: handleCancelReply,
    }));
  }, [
    conversation,
    handleCancelReply,
    handleDeleteConversation,
    handleMarkedComplete,
    handleOfferUpdated,
    handleSend,
    loading,
    replyTo,
    sending,
    setShellState,
  ]);

  useEffect(() => {
    return () => {
      setShellState((prev) => ({
        ...prev,
        onDelete: undefined,
        onMarkedComplete: undefined,
        onOfferUpdated: undefined,
        inputDisabled: true,
        replyTo: null,
        onCancelReply: undefined,
      }));
    };
  }, [setShellState]);

  if (!conversation) {
    if (loading) {
      if (!showSkeleton) {
        return <div className="h-full" />;
      }

      return (
        <div className="h-full overflow-y-auto no-scroll px-4 pt-24 pb-3 flex flex-col-reverse gap-4 fade-in duration-100">
          <div className="h-12 bg-stone-200 dark:bg-[#1f2230] rounded-lg w-2/3 ml-auto" />
          <div className="h-16 bg-stone-200 dark:bg-[#1f2230] rounded-lg w-1/2" />
          <div className="h-12 bg-stone-200 dark:bg-[#1f2230] rounded-lg w-3/4 ml-auto" />
          <div className="h-20 bg-stone-200 dark:bg-[#1f2230] rounded-lg w-2/3" />
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-stone-50 dark:bg-[#0f1117] p-8 text-center">
        <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">
          Conversation not found
        </p>
        <button
          onClick={() => router.push('/messages')}
          className="text-xs text-amber-700 dark:text-amber-500 hover:underline"
        >
          ← Back to messages
        </button>
      </div>
    );
  }

  const otherName = `${conversation.otherParticipant.firstName} ${conversation.otherParticipant.lastName}`;

  return (
    <>
      {showSkeleton && (
        <div className="h-full overflow-y-auto no-scroll px-4 pt-24 pb-3 flex flex-col-reverse gap-4 fade-in duration-100">
          <div className="h-12 bg-stone-200 dark:bg-[#1f2230] rounded-lg w-2/3 ml-auto" />
          <div className="h-16 bg-stone-200 dark:bg-[#1f2230] rounded-lg w-1/2" />
          <div className="h-12 bg-stone-200 dark:bg-[#1f2230] rounded-lg w-3/4 ml-auto" />
          <div className="h-20 bg-stone-200 dark:bg-[#1f2230] rounded-lg w-2/3" />
        </div>
      )}

      {!loading && (
        <div
          key={conversationId}
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          className="h-full pt-24 pb-3 px-4 2xl:px-64 overflow-y-auto animate-in fade-in duration-500"
        >
          <div className="min-h-full flex flex-col">
            {loadingOlder && (
              <div className="py-2 text-center text-[11px] text-stone-400 dark:text-stone-500">
                Loading older messages...
              </div>
            )}

            <div className="mt-auto">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 text-center py-8">
                  <p className="text-xs text-stone-400 dark:text-stone-600">
                    No messages yet. Say hello!
                  </p>
                </div>
              )}

              {messages.map((msg, index) => {
                const prev = messages[index - 1];
                const next = messages[index + 1];
                const actionLabel = getSystemActionLabel(msg.content);

                const showDate =
                  !prev || !isSameDay(prev.createdAt, msg.createdAt);
                const showTime =
                  !next ||
                  next.senderId !== msg.senderId ||
                  new Date(next.createdAt).getTime() -
                    new Date(msg.createdAt).getTime() >
                    60_000;

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500 px-2">
                          {formatDateSeparator(msg.createdAt)}
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}

                    {actionLabel ? (
                      <div className="flex justify-center my-1.5">
                        <span className="text-[11px] text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-[#1c1f2e] border border-border rounded-full px-3 py-1">
                          {actionLabel}
                        </span>
                      </div>
                    ) : (
                      <MessageBubble
                        message={msg}
                        currentUserId={effectiveCurrentUserId}
                        showTime={showTime}
                        otherName={otherName}
                        onReply={handleReply}
                        onReact={handleReact}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onOpenMediaViewer={handleOpenMediaViewer}
                      />
                    )}

                    {!actionLabel &&
                      msg.senderId === effectiveCurrentUserId &&
                      conversation.otherLastReadMessageId === msg.id && (
                        <div className="flex justify-end pr-1 mt-0.5">
                          {conversation.otherParticipant.profileImageUrl ? (
                            <img
                              src={
                                conversation.otherParticipant.profileImageUrl
                              }
                              alt={`${conversation.otherParticipant.firstName} read receipt`}
                              className={cn(
                                'w-3.5 h-3.5 rounded-full object-cover border border-border',
                                animatedReadMarkerId === msg.id &&
                                  'animate-read-drop',
                              )}
                            />
                          ) : (
                            <span
                              className={cn(
                                'w-3.5 h-3.5 rounded-full border border-border bg-stone-200 dark:bg-stone-700 text-[8px] font-bold text-stone-700 dark:text-stone-100 inline-flex items-center justify-center',
                                animatedReadMarkerId === msg.id &&
                                  'animate-read-drop',
                              )}
                            >
                              {conversation.otherParticipant.firstName
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          )}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <MessageEditModal
          initial={editTarget.content}
          messageId={editTarget.id}
          conversationId={conversationId}
          onSave={handleEditSave}
          onClose={() => setEditTarget(null)}
        />
      )}

      {mediaViewerIndex !== null && mediaItems.length > 0 && (
        <MediaViewerModal
          mediaItems={mediaItems}
          activeIndex={mediaViewerIndex}
          onSelect={setMediaViewerIndex}
          onClose={() => setMediaViewerIndex(null)}
        />
      )}

      <style jsx>{`
        @keyframes readDrop {
          0% {
            opacity: 0;
            transform: translateY(-10px) scale(0.92);
          }
          65% {
            opacity: 1;
            transform: translateY(1px) scale(1);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-read-drop {
          animation: readDrop 280ms ease-out;
        }
      `}</style>
    </>
  );
}
