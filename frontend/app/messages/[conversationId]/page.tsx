"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation, Message, ReactionType, ReplyPreview } from "@/types/messaging";
import {
  getConversation,
  getMessages,
  sendMessage,
  markConversationRead,
  deleteConversation,
  reactToMessage,
  editMessage,
  deleteMessage,
} from "@/services/messagingService";
import { useUser } from "@/utils/UserContext";
import ChatHeader         from "@/components/messages/chat-header";
import ListingContextCard from "@/components/messages/listing-context-card";
import MessageBubble      from "@/components/messages/message-bubble";
import MessageInput       from "@/components/messages/message-input";

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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const currentUserId = (user as any)?.id ?? "me";

  const conversationId =
    typeof params.conversationId === "string" ? params.conversationId : "";

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [sending,      setSending]      = useState(false);

  // ── Reply state ──────────────────────────────────────────────────────────
  const [replyTo, setReplyTo] = useState<ReplyPreview | null>(null);

  // ── Edit state ───────────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<{ id: string; content: string } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const [conv, msgs] = await Promise.all([
        getConversation(conversationId),
        getMessages(conversationId),
      ]);
      setConversation(conv);
      setMessages(msgs);
      await markConversationRead(conversationId);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSend = async (content: string) => {
    if (sending) return;
    setSending(true);
    try {
      const newMsg = await sendMessage(conversationId, content, currentUserId, replyTo);
      setMessages((prev) => [...prev, newMsg]);
      setReplyTo(null);
    } finally {
      setSending(false);
    }
  };

  const handleReply = (msg: Message) => {
    const senderName =
      msg.senderId === currentUserId
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
    await reactToMessage(conversationId, messageId, currentUserId, reaction);
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const existing = (m.reactions ?? []).filter((r) => r.userId !== currentUserId);
        return {
          ...m,
          reactions: reaction ? [...existing, { userId: currentUserId, type: reaction }] : existing,
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

  const handleDeleteConversation = async () => {
    await deleteConversation(conversationId);
    router.push("/messages");
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-stone-50 dark:bg-[#0f1117]">
        <Loader2 size={24} className="animate-spin text-stone-400 dark:text-stone-600" />
      </div>
    );
  }

  if (!conversation) {
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
      <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-[#0f1117]">

        <ChatHeader conversation={conversation} onDelete={handleDeleteConversation} />
        <ListingContextCard listing={conversation.listing} />

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto no-scroll px-4 py-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
              <p className="text-xs text-stone-400 dark:text-stone-600">No messages yet. Say hello!</p>
            </div>
          )}

          {messages.map((msg, i) => {
            const prev     = messages[i - 1];
            const next     = messages[i + 1];
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
                    <span className="text-[10px] font-medium text-stone-400 dark:text-stone-500 px-2">
                      {formatDateSeparator(msg.createdAt)}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}
                <MessageBubble
                  message={msg}
                  currentUserId={currentUserId}
                  showTime={showTime}
                  otherName={otherName}
                  onReply={handleReply}
                  onReact={handleReact}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>

        <MessageInput
          onSend={handleSend}
          disabled={sending}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />

        {/* Mobile nav spacer */}
        <div className="h-14 md:h-0 shrink-0" />
      </div>

      {/* Edit modal */}
      {editTarget && (
        <EditModal
          initial={editTarget.content}
          onSave={handleEditSave}
          onClose={() => setEditTarget(null)}
        />
      )}
    </>
  );
}
