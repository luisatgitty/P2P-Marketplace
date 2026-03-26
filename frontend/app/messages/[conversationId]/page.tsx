"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Lightbox from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import { cn } from "@/lib/utils";
import { toast } from "sonner"
import type { PostCardProps } from "@/components/post-card";
import type { Conversation, Message, MessageAttachment, ReactionType, ReplyPreview } from "@/types/messaging";
import { getListingDetailById } from "@/services/listingDetailService";
import {
  getConversations,
  getConversation,
  getMessages,
  sendMessage,
  markConversationRead,
  deleteConversation,
  reactToMessage,
  editMessage,
  deleteMessage,
  openOrCreateConversationFromListing,
} from "@/services/messagingService";
import { useUser } from "@/utils/UserContext";
import MessageBubble      from "@/components/messages/message-bubble";
import { useMessageShell } from "@/components/messages/message-shell-context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateSeparator(iso: string): string {
  const date = new Date(iso);
  const now  = new Date();
  const diff = now.getDate() - date.getDate();
  if (diff === 0 && now.getMonth() === date.getMonth()) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString("en-PH", { weekday: "long", month: "short", day: "numeric" });
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function getSystemActionLabel(content?: string): string | null {
  const raw = String(content ?? "").trim();
  const actionPrefixes = ["__OFFER_ACTION__:", "__DEAL_ACTION__:"];
  const matchedPrefix = actionPrefixes.find((prefix) => raw.startsWith(prefix));
  if (!matchedPrefix) {
    return null;
  }
  const actionText = raw.replace(matchedPrefix, "").trim();
  if (!actionText) {
    return null;
  }
  return actionText;
}

const DRAFT_CONVERSATION_ID = "new";

function splitSellerName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "Seller", lastName: "User" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "Seller" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function toListingType(type: PostCardProps["type"]): "SELL" | "RENT" | "SERVICE" {
  if (type === "rent") return "RENT";
  if (type === "service") return "SERVICE";
  return "SELL";
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
      status: "ACTIVE",
    },
    otherParticipant: {
      id: listing.seller.id ?? "",
      firstName: seller.firstName,
      lastName: seller.lastName,
      isOnline: false,
    },
    unreadCount: 0,
    isSeller: false,
  };
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

function EditModal({
  initial,
  onSave,
  onClose,
}: {
  initial: string;
  onSave: (val: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  return (
    <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={cn(
        "w-full max-w-md bg-white dark:bg-[#1c1f2e] rounded-2xl shadow-2xl border border-border",
        "animate-in fade-in slide-in-from-bottom-4 duration-200"
      )}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-50">Edit message</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-lg leading-none">×</button>
        </div>
        <div className="p-4">
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (value.trim()) onSave(value.trim()); }
              if (e.key === "Escape") onClose();
            }}
            rows={3}
            className={cn(
              "w-full resize-none rounded-xl px-3.5 py-2.5 text-sm outline-none",
              "bg-stone-50 dark:bg-[#13151f] border border-border",
              "text-stone-800 dark:text-stone-100 focus:ring-1 focus:ring-amber-500/50"
            )}
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { if (value.trim()) onSave(value.trim()); }}
              disabled={!value.trim() || value.trim() === initial}
              className={cn(
                "px-4 py-2 text-xs font-semibold rounded-lg transition-colors",
                value.trim() && value.trim() !== initial
                  ? "bg-amber-700 text-white hover:bg-amber-600"
                  : "bg-stone-100 dark:bg-[#252837] text-stone-400 cursor-not-allowed"
              )}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaViewerModal({
  mediaItems,
  activeIndex,
  onSelect,
  onClose,
}: {
  mediaItems: MessageAttachment[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  const slides = mediaItems.map((item) => {
    if (item.fileType === "VIDEO") {
      return {
        type: "video" as const,
        sources: [{ src: item.fileUrl, type: "video/mp4" }],
        poster: item.fileUrl,
      };
    }

    return {
      src: item.fileUrl,
      alt: item.fileName ?? "media",
    };
  });

  return (
    <Lightbox
      open={activeIndex >= 0}
      close={onClose}
      index={activeIndex}
      slides={slides}
      plugins={[Zoom, Thumbnails, Video]}
      on={{
        view: ({ index }) => onSelect(index),
      }}
      zoom={{
        maxZoomPixelRatio: 4,
        zoomInMultiplier: 2,
        doubleTapDelay: 250,
      }}
      thumbnails={{
        position: "bottom",
        width: 72,
        height: 72,
        border: 1,
        borderRadius: 8,
        gap: 8,
      }}
      carousel={{
        finite: false,
      }}
      controller={{
        closeOnBackdropClick: true,
      }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { setShellState } = useMessageShell();
  const currentUserId = user?.userId ?? "";

  const conversationId =
    typeof params.conversationId === "string" ? params.conversationId : "";
  const isDraftConversation = conversationId === DRAFT_CONVERSATION_ID;
  const draftListingId = (searchParams.get("listingId") ?? "").trim();

  const [showSkeleton, setShowSkeleton] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [sending,      setSending]      = useState(false);

  // ── Reply state ──────────────────────────────────────────────────────────
  const [replyTo, setReplyTo] = useState<ReplyPreview | null>(null);

  // ── Edit state ───────────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<{ id: string; content: string } | null>(null);
  const [mediaViewerIndex, setMediaViewerIndex] = useState<number | null>(null);
  const [animatedReadMarkerId, setAnimatedReadMarkerId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    setMessages([]);
    try {
      if (isDraftConversation) {
        if (!draftListingId) {
          setConversation(null);
          setMessages([]);
          return;
        }

        const existingConversations = await getConversations();
        const existingConversation = existingConversations.find((item) => item.listing.id === draftListingId);
        if (existingConversation) {
          router.replace(`/messages/${existingConversation.id}`);
          return;
        }

        const listingPayload = await getListingDetailById(draftListingId);
        setConversation(toDraftConversation(listingPayload.listing));
        setMessages([]);
        return;
      }

      const [conv, msgs] = await Promise.all([
        getConversation(conversationId),
        getMessages(conversationId),
      ]);
      setConversation(conv);
      setMessages(msgs);
      await markConversationRead(conversationId);
    } catch {
      setConversation(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, draftListingId, isDraftConversation, router]);

  useEffect(() => { load(); }, [load]);

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

    const otherUserId = conversation?.otherParticipant?.id ?? "";
    if (!otherUserId) return "";

    const mine = messages.find((msg) => msg.senderId !== otherUserId)?.senderId;
    return mine ?? "";
  }, [conversation?.otherParticipant?.id, currentUserId, messages]);

  useEffect(() => {
    if (isDraftConversation || !conversationId) return;

    const onRealtimeMessage = async (evt: Event) => {
      const custom = evt as CustomEvent<{ conversationId?: string }>;
      if (custom.detail?.conversationId !== conversationId) return;

      const freshMessages = await getMessages(conversationId);
      setMessages(freshMessages);
      const freshConversation = await getConversation(conversationId);
      if (freshConversation) {
        setConversation(freshConversation);
      }
      await markConversationRead(conversationId);
    };

    window.addEventListener("realtime:message", onRealtimeMessage as EventListener);
    return () => window.removeEventListener("realtime:message", onRealtimeMessage as EventListener);
  }, [conversationId, isDraftConversation]);

  useEffect(() => {
    if (isDraftConversation || !conversationId) return;

    const onRealtimeReaction = async (evt: Event) => {
      const custom = evt as CustomEvent<{ conversationId?: string }>;
      if (custom.detail?.conversationId !== conversationId) return;

      const freshMessages = await getMessages(conversationId);
      setMessages(freshMessages);
    };

    const onRealtimeStatus = (evt: Event) => {
      const custom = evt as CustomEvent<{ conversationId?: string; messageId?: string; status?: Message["status"] }>;
      if (custom.detail?.conversationId !== conversationId) return;
      const targetMessageId = custom.detail?.messageId ?? "";
      const nextStatus = custom.detail?.status;
      if (!targetMessageId || !nextStatus) return;

      setMessages((prev) =>
        prev.map((msg) => (msg.id === targetMessageId ? { ...msg, status: nextStatus } : msg))
      );
    };

    const onRealtimeRead = (evt: Event) => {
      const custom = evt as CustomEvent<{ conversationId?: string; lastReadMessageId?: string }>;
      if (custom.detail?.conversationId !== conversationId) return;

      const lastReadMessageId = (custom.detail?.lastReadMessageId ?? "").trim();
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
            return { ...msg, status: "READ" };
          }
          return msg;
        });
      });
    };

    const onRealtimeMessageEdit = (evt: Event) => {
      const custom = evt as CustomEvent<{ conversationId?: string; messageId?: string; content?: string; isEdited?: boolean }>;
      if (custom.detail?.conversationId !== conversationId) return;

      const messageId = custom.detail?.messageId ?? "";
      if (!messageId) return;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content: custom.detail?.content ?? msg.content,
                isEdited: custom.detail?.isEdited ?? true,
              }
            : msg
        )
      );
    };

    const onRealtimeMessageUnsend = (evt: Event) => {
      const custom = evt as CustomEvent<{ conversationId?: string; messageId?: string; isUnsent?: boolean }>;
      if (custom.detail?.conversationId !== conversationId) return;

      const messageId = custom.detail?.messageId ?? "";
      if (!messageId) return;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, isUnsent: custom.detail?.isUnsent ?? true, content: undefined, attachments: [], reactions: [] }
            : msg
        )
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
      const custom = evt as CustomEvent<{ listingId?: string; status?: string }>;
      const listingId = (custom.detail?.listingId ?? "").trim();
      const status = (custom.detail?.status ?? "").trim().toUpperCase();
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

      const [freshConversation, freshMessages] = await Promise.all([
        getConversation(conversationId),
        getMessages(conversationId),
      ]);

      if (freshConversation) {
        setConversation(freshConversation);
      }
      setMessages(freshMessages);
    };

    window.addEventListener("realtime:reaction", onRealtimeReaction as EventListener);
    window.addEventListener("realtime:status", onRealtimeStatus as EventListener);
    window.addEventListener("realtime:read", onRealtimeRead as EventListener);
    window.addEventListener("realtime:message-edit", onRealtimeMessageEdit as EventListener);
    window.addEventListener("realtime:message-unsend", onRealtimeMessageUnsend as EventListener);
    window.addEventListener("realtime:listing-status", onRealtimeListingStatus as EventListener);
    window.addEventListener("realtime:deal-updated", onRealtimeDealUpdated as EventListener);

    return () => {
      window.removeEventListener("realtime:reaction", onRealtimeReaction as EventListener);
      window.removeEventListener("realtime:status", onRealtimeStatus as EventListener);
      window.removeEventListener("realtime:read", onRealtimeRead as EventListener);
      window.removeEventListener("realtime:message-edit", onRealtimeMessageEdit as EventListener);
      window.removeEventListener("realtime:message-unsend", onRealtimeMessageUnsend as EventListener);
      window.removeEventListener("realtime:listing-status", onRealtimeListingStatus as EventListener);
      window.removeEventListener("realtime:deal-updated", onRealtimeDealUpdated as EventListener);
    };
  }, [conversationId, effectiveCurrentUserId, isDraftConversation]);

  useEffect(() => {
    const onPresenceUpdate = (evt: Event) => {
      const custom = evt as CustomEvent<{ userId?: string; isOnline?: boolean }>;
      const updatedUserId = custom.detail?.userId ?? "";
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

    window.addEventListener("realtime:presence", onPresenceUpdate as EventListener);
    return () => window.removeEventListener("realtime:presence", onPresenceUpdate as EventListener);
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
        (msg.attachments ?? []).filter((att) => att.fileType === "IMAGE" || att.fileType === "VIDEO")
      ),
    [messages]
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSend = useCallback(async (content: string, attachments: Array<{ name: string; mimeType: string; data: string }>) => {
    if (sending) return;
    setSending(true);
    try {
      let targetConversationId = conversationId;
      if (isDraftConversation) {
        if (!draftListingId) {
          throw new Error("Listing is required to start a conversation.");
        }

        targetConversationId = await openOrCreateConversationFromListing(draftListingId);
        const freshConversation = await getConversation(targetConversationId);
        if (freshConversation) {
          setConversation(freshConversation);
        }
        router.replace(`/messages/${targetConversationId}`);
      }

      const newMsg = await sendMessage(targetConversationId, content, attachments, replyTo);
      setMessages((prev) => [...prev, newMsg]);
      setReplyTo(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send message.";
      toast.error(message, { position: "top-center" });
      throw err;
    } finally {
      setSending(false);
    }
  }, [sending, conversationId, isDraftConversation, draftListingId, replyTo, router]);

  const handleReply = (msg: Message) => {
    const senderName =
      msg.senderId === effectiveCurrentUserId
        ? "You"
        : conversation?.otherParticipant
          ? `${conversation.otherParticipant.firstName}`
          : "Them";

    let contentPreview = msg.content ?? "";
    if (!contentPreview) {
      const atts = msg.attachments ?? [];
      const imgs = atts.filter((a) => a.fileType === "IMAGE").length;
      const vids = atts.filter((a) => a.fileType === "VIDEO").length;
      const parts: string[] = [];
      if (imgs) parts.push(`📷 ${imgs > 1 ? `${imgs} photos` : "Photo"}`);
      if (vids) parts.push(`🎥 ${vids > 1 ? `${vids} videos` : "Video"}`);
      contentPreview = parts.join(", ");
    }

    setReplyTo({ messageId: msg.id, senderId: msg.senderId, senderName, contentPreview });
  };

  const handleReact = async (messageId: string, reaction: ReactionType | null) => {
    await reactToMessage(conversationId, messageId, effectiveCurrentUserId, reaction);
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const existing = (m.reactions ?? []).filter((r) => r.userId !== effectiveCurrentUserId);
        return {
          ...m,
          reactions: reaction ? [...existing, { userId: effectiveCurrentUserId, type: reaction }] : existing,
        };
      })
    );
  };

  const handleEdit = (messageId: string, currentContent: string) => {
    setEditTarget({ id: messageId, content: currentContent });
  };

  const handleEditSave = async (newContent: string) => {
    if (!editTarget) return;
    await editMessage(conversationId, editTarget.id, newContent);
    setMessages((prev) =>
      prev.map((m) => m.id === editTarget.id ? { ...m, content: newContent, isEdited: true } : m)
    );
    setEditTarget(null);
  };

  const handleDelete = async (messageId: string, unsend: boolean) => {
    await deleteMessage(conversationId, messageId, unsend);
    if (unsend) {
      setMessages((prev) =>
        prev.map((m) => m.id === messageId ? { ...m, isUnsent: true, content: undefined, attachments: [] } : m)
      );
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  };

  const handleDeleteConversation = useCallback(async () => {
    if (isDraftConversation) {
      router.push("/messages");
      return;
    }

    await deleteConversation(conversationId);
    toast.success("Conversation deleted", { position: "top-center" });
    router.push("/messages");
  }, [conversationId, isDraftConversation, router]);

  const handleOpenMediaViewer = (attachmentId: string) => {
    const idx = mediaItems.findIndex((item) => item.id === attachmentId);
    if (idx >= 0) {
      setMediaViewerIndex(idx);
    }
  };

  const handleMarkedSold = useCallback(() => {
    setConversation((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        listing: {
          ...prev.listing,
          status: "SOLD",
        },
      };
    });
  }, []);

  const handleOfferUpdated = useCallback(async () => {
    if (isDraftConversation || !conversationId) return;

    const [freshConversation, freshMessages] = await Promise.all([
      getConversation(conversationId),
      getMessages(conversationId),
    ]);

    if (freshConversation) {
      setConversation(freshConversation);
    }
    setMessages(freshMessages);
    await markConversationRead(conversationId);
  }, [conversationId, isDraftConversation]);

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
      onMarkedSold: handleMarkedSold,
      onOfferUpdated: handleOfferUpdated,
      onSend: handleSend,
      inputDisabled: loading || sending || !conversation,
      replyTo,
      onCancelReply: handleCancelReply,
    }));
  }, [conversation, handleCancelReply, handleDeleteConversation, handleMarkedSold, handleOfferUpdated, handleSend, loading, replyTo, sending, setShellState]);

  useEffect(() => {
    return () => {
      setShellState((prev) => ({
        ...prev,
        onDelete: undefined,
        onMarkedSold: undefined,
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
        <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Conversation not found</p>
        <button onClick={() => router.push("/messages")} className="text-xs text-amber-700 dark:text-amber-500 hover:underline">
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
        <div key={conversationId} className="h-full overflow-y-auto no-scroll px-4 pt-24 pb-3 flex flex-col-reverse animate-in fade-in duration-500">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 text-center h-full my-auto">
              <p className="text-xs text-stone-400 dark:text-stone-600">No messages yet. Say hello!</p>
            </div>
          )}

          {[...messages].reverse().map((msg, reversedIndex) => {
            const originalIndex = messages.length - 1 - reversedIndex;
            const prev = messages[originalIndex - 1];
            const next = messages[originalIndex + 1];
            const actionLabel = getSystemActionLabel(msg.content);

            const showDate = !prev || !isSameDay(prev.createdAt, msg.createdAt);
            const showTime =
              !next ||
              next.senderId !== msg.senderId ||
              new Date(next.createdAt).getTime() - new Date(msg.createdAt).getTime() > 60_000;

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

                {!actionLabel && msg.senderId === effectiveCurrentUserId && conversation.otherLastReadMessageId === msg.id && (
                  <div className="flex justify-end pr-1 mt-0.5">
                    {conversation.otherParticipant.profileImageUrl ? (
                      <img
                        src={conversation.otherParticipant.profileImageUrl}
                        alt={`${conversation.otherParticipant.firstName} read receipt`}
                        className={cn(
                          "w-3.5 h-3.5 rounded-full object-cover border border-border",
                          animatedReadMarkerId === msg.id && "animate-read-drop"
                        )}
                      />
                    ) : (
                      <span
                        className={cn(
                          "w-3.5 h-3.5 rounded-full border border-border bg-stone-200 dark:bg-stone-700 text-[8px] font-bold text-stone-700 dark:text-stone-100 inline-flex items-center justify-center",
                          animatedReadMarkerId === msg.id && "animate-read-drop"
                        )}
                      >
                        {conversation.otherParticipant.firstName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <EditModal
          initial={editTarget.content}
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
