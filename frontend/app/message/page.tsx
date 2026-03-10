"use client";

import { useState, useEffect, useRef } from "react";

const API_BASE = "http://localhost:8080";

// ─── Icons ───────────────────────────────────────────────────────────────────
const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);
const UserIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4z" />
  </svg>
);
const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);
const InboxIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface Conversation {
  userId: number;
  name: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MessagesPage() {
  // TODO: Replace with actual auth (e.g. from localStorage or context)
  const currentUserId = 1;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch inbox on mount
  useEffect(() => {
    fetchInbox();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchInbox() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/messages/inbox/${currentUserId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load inbox");

      // Group messages by sender into conversations
      const map = new Map<number, Conversation>();
      (data.data as Message[]).forEach((msg) => {
        const otherId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
        if (!map.has(otherId)) {
          map.set(otherId, {
            userId: otherId,
            name: `User #${otherId}`, // Replace with actual name lookup
            lastMessage: msg.content,
            lastTime: formatTime(msg.createdAt),
            unread: msg.isRead ? 0 : 1,
          });
        } else {
          const c = map.get(otherId)!;
          if (!msg.isRead) c.unread++;
        }
      });
      setConversations(Array.from(map.values()));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchConversation(otherId: number) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/messages/conversation/${currentUserId}/${otherId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load conversation");
      setMessages(data.data as Message[]);

      // Mark unread messages as read
      (data.data as Message[])
        .filter((m) => m.receiverId === currentUserId && !m.isRead)
        .forEach((m) => markAsRead(m.id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(messageId: number) {
    try {
      await fetch(`${API_BASE}/messages/${messageId}/read`, { method: "PATCH" });
    } catch {}
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedUser) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUserId,
          receiverId: selectedUser.userId,
          content: newMessage.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send message");

      setNewMessage("");
      await fetchConversation(selectedUser.userId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function openConversation(conv: Conversation) {
    setSelectedUser(conv);
    fetchConversation(conv.userId);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-xl font-semibold text-stone-800 mb-6 flex items-center gap-2">
        <InboxIcon /> Messages
      </h1>

      <div className="flex border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-sm min-h-[600px]">

        {/* ── Conversation List ── */}
        <div className={`w-full sm:w-80 border-r border-stone-200 flex flex-col ${selectedUser ? "hidden sm:flex" : "flex"}`}>
          <div className="p-4 border-b border-stone-100">
            <p className="text-sm font-medium text-stone-500">Inbox</p>
          </div>

          {loading && !selectedUser ? (
            <div className="flex-1 flex items-center justify-center text-stone-400 text-sm">Loading...</div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-rose-400 text-sm px-4 text-center">{error}</div>
          ) : conversations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-400 text-sm gap-2">
              <InboxIcon />
              <p>No messages yet</p>
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto divide-y divide-stone-100">
              {conversations.map((conv) => (
                <li key={conv.userId}>
                  <button
                    onClick={() => openConversation(conv)}
                    className={`w-full flex items-start gap-3 px-4 py-3.5 hover:bg-stone-50 transition-colors text-left ${
                      selectedUser?.userId === conv.userId ? "bg-stone-100" : ""
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 shrink-0">
                      <UserIcon />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-stone-800 truncate">{conv.name}</p>
                        <span className="text-xs text-stone-400 shrink-0 ml-2">{conv.lastTime}</span>
                      </div>
                      <p className="text-xs text-stone-500 truncate mt-0.5">{conv.lastMessage}</p>
                    </div>
                    {conv.unread > 0 && (
                      <span className="w-4 h-4 bg-stone-800 text-stone-100 text-xs rounded-full flex items-center justify-center shrink-0 mt-1">
                        {conv.unread}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Conversation View ── */}
        <div className={`flex-1 flex flex-col ${selectedUser ? "flex" : "hidden sm:flex"}`}>
          {!selectedUser ? (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-400 text-sm gap-2">
              <InboxIcon />
              <p>Select a conversation</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-200">
                <button onClick={() => setSelectedUser(null)} className="sm:hidden p-1 text-stone-500 hover:text-stone-800">
                  <BackIcon />
                </button>
                <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-500">
                  <UserIcon />
                </div>
                <p className="text-sm font-semibold text-stone-800">{selectedUser.name}</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-stone-400 text-sm">Loading...</div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-stone-400 text-sm">No messages yet. Say hello!</div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderId === currentUserId;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                          isMine
                            ? "bg-stone-800 text-stone-100 rounded-br-sm"
                            : "bg-stone-100 text-stone-800 rounded-bl-sm"
                        }`}>
                          <p>{msg.content}</p>
                          <p className={`text-xs mt-1 ${isMine ? "text-stone-400" : "text-stone-400"}`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Error */}
              {error && <p className="text-xs text-rose-400 px-4 pb-1">{error}</p>}

              {/* Input */}
              <div className="px-4 py-3 border-t border-stone-200 flex items-end gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message… (Enter to send)"
                  rows={1}
                  className="flex-1 resize-none bg-stone-100 border border-stone-200 rounded-2xl px-4 py-2.5 text-sm text-stone-700 placeholder-stone-400 outline-none focus:border-stone-400 transition-colors"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="w-10 h-10 bg-stone-800 text-stone-100 rounded-full flex items-center justify-center hover:bg-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  <SendIcon />
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}