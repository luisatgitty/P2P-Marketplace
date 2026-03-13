"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import type { Conversation, Message } from "@/types/messaging";
import {
  getConversation,
  getMessages,
  sendMessage as sendMsgService,
  markConversationRead,
  deleteConversation,
} from "@/services/messagingService";
import ChatHeader from "@/components/messages/chat-header";
import ListingContextCard from "@/components/messages/listing-context-card";
import MessageBubble from "@/components/messages/message-bubble";
import MessageInput from "@/components/messages/message-input";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Mock current user — swap with real auth context when backend is ready */
const CURRENT_USER_ID = "me";

function formatDateLabel(iso: string): string {
  const d     = new Date(iso);
  const today = new Date();
  const yest  = new Date(today);
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString())  return "Yesterday";
  return d.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ConversationPage() {
  const params         = useParams<{ conversationId: string }>();
  const router         = useRouter();
  const conversationId = params.conversationId;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [notFound,     setNotFound]     = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const isFirst   = useRef(true);

  const scrollToBottom = (instant = false) => {
    bottomRef.current?.scrollIntoView({ behavior: instant ? "instant" : "smooth" });
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [conv, msgs] = await Promise.all([
      getConversation(conversationId),
      getMessages(conversationId),
    ]);
    if (!conv) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setConversation(conv);
    setMessages(msgs);
    setLoading(false);
    await markConversationRead(conversationId);
  }, [conversationId]);

  useEffect(() => { load(); }, [load]);

  // Instant scroll after initial load, smooth after new messages
  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom(isFirst.current);
      isFirst.current = false;
    }
  }, [loading, messages]);

  const handleSend = async (content: string) => {
    const newMsg = await sendMsgService(conversationId, content, CURRENT_USER_ID);
    setMessages((prev) => [...prev, newMsg]);
  };

  const handleDelete = async () => {
    await deleteConversation(conversationId);
    router.push("/messages");
  };

  // ── Loading skeleton ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-white dark:bg-[#1c1f2e] animate-pulse">
        <div className="h-14 border-b border-border bg-stone-50 dark:bg-[#252837]" />
        <div className="mx-3 my-2 h-14 rounded-xl bg-stone-100 dark:bg-[#252837]" />
        <div className="flex-1 p-4 space-y-3">
          {[48, 36, 52, 32, 44, 40].map((w, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
              <div
                className="h-10 rounded-2xl bg-stone-100 dark:bg-[#252837]"
                style={{ width: `${w}%` }}
              />
            </div>
          ))}
        </div>
        <div className="h-16 border-t border-border bg-stone-50 dark:bg-[#252837]" />
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────

  if (notFound || !conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-stone-50 dark:bg-[#0f1117] p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#1c1f2e] border border-border shadow-sm flex items-center justify-center">
          <MessageSquare size={28} className="text-stone-300 dark:text-stone-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Conversation not found</p>
          <p className="text-xs text-stone-400 dark:text-stone-600 mt-1 max-w-45 mx-auto leading-relaxed">
            This conversation may have been deleted or doesn&apos;t exist.
          </p>
        </div>
        <button
          onClick={() => router.push("/messages")}
          className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
        >
          ← Back to Messages
        </button>
      </div>
    );
  }

  // ── Render messages with date separators ─────────────────────────────────

  const messageNodes: React.ReactNode[] = [];
  let lastDateLabel = "";
  let lastSenderId  = "";

  messages.forEach((msg, i) => {
    const dateLabel = formatDateLabel(msg.createdAt);

    if (dateLabel !== lastDateLabel) {
      lastDateLabel = dateLabel;
      lastSenderId  = "";
      messageNodes.push(
        <div key={`sep-${i}`} className="flex items-center gap-3 my-3 px-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 whitespace-nowrap">
            {dateLabel}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
      );
    }

    // Show timestamp when sender switches or it's the last message
    const showTime   = msg.senderId !== lastSenderId || i === messages.length - 1;
    lastSenderId = msg.senderId;

    messageNodes.push(
      <MessageBubble
        key={msg.id}
        message={msg}
        currentUserId={CURRENT_USER_ID}
        showTime={showTime}
      />
    );
  });

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#1c1f2e] min-h-0">

      {/* Header: avatar, name, online status, action menu */}
      <ChatHeader conversation={conversation} onDelete={handleDelete} />

      {/* Listing context strip */}
      <ListingContextCard listing={conversation.listing} />

      {/* Messages scroll area */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-16">
            <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-[#252837] flex items-center justify-center">
              <MessageSquare size={20} className="text-stone-400 dark:text-stone-500" />
            </div>
            <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Start the conversation</p>
            <p className="text-xs text-stone-400 dark:text-stone-600 max-w-50 leading-relaxed">
              Say hello or ask a question about the listing above.
            </p>
          </div>
        ) : (
          messageNodes
        )}
        <div ref={bottomRef} />
      </div>

      {/* Message input */}
      <MessageInput onSend={handleSend} />
    </div>
  );
}
