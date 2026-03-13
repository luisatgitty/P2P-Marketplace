/**
 * messagingService.ts
 *
 * Currently uses localStorage mock data so the UI works without a backend.
 * Each function has an API-ready stub (commented out) that follows the same
 * fetch pattern used in authService.ts — swap when the Go backend is ready.
 */

import type { Conversation, Message } from "@/types/messaging";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function apiFetch(route: string, options?: RequestInit) {
  return fetch(`${API}${route}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
}

// ─── Mock seed data ───────────────────────────────────────────────────────────

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    isSeller: false,
    lastMessage: "Is the price still negotiable?",
    lastMessageAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    unreadCount: 2,
    otherParticipant: { id: "u2", firstName: "Maria", lastName: "Santos",   isOnline: true  },
    listing: { id: "l1", title: "Sony A7III Camera",        price: 45000,  listingType: "SELL",    status: "AVAILABLE" },
  },
  {
    id: "conv-2",
    isSeller: false,
    lastMessage: "I'll pick it up Saturday morning.",
    lastMessageAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    unreadCount: 0,
    otherParticipant: { id: "u3", firstName: "Jun",   lastName: "dela Cruz", isOnline: false },
    listing: { id: "l2", title: "Mountain Bike (Weekend)",  price: 800,    priceUnit: "/ day", listingType: "RENT",    status: "AVAILABLE" },
  },
  {
    id: "conv-3",
    isSeller: true,
    lastMessage: "The SSD upgrade is done. Ready for pickup!",
    lastMessageAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    unreadCount: 1,
    otherParticipant: { id: "u4", firstName: "Carlo", lastName: "Reyes",    isOnline: true  },
    listing: { id: "l3", title: "Laptop Repair & Upgrade",  price: 500,    priceUnit: "+",     listingType: "SERVICE", status: "AVAILABLE" },
  },
  {
    id: "conv-4",
    isSeller: false,
    lastMessage: "Can you do COD?",
    lastMessageAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    unreadCount: 0,
    otherParticipant: { id: "u5", firstName: "Ana",   lastName: "Villanueva", isOnline: false },
    listing: { id: "l4", title: "iPhone 14 Pro — Midnight", price: 52000, listingType: "SELL",    status: "AVAILABLE" },
  },
  {
    id: "conv-5",
    isSeller: true,
    lastMessage: "Thanks! I'll return it Monday.",
    lastMessageAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    unreadCount: 0,
    otherParticipant: { id: "u6", firstName: "Bea",   lastName: "Gutierrez", isOnline: false },
    listing: { id: "l5", title: "DSLR Lens 50mm f/1.4",     price: 300,   priceUnit: "/ day", listingType: "RENT",    status: "AVAILABLE" },
  },
  {
    id: "conv-6",
    isSeller: false,
    lastMessage: "I can come by Wednesday at 2pm.",
    lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    unreadCount: 0,
    otherParticipant: { id: "u7", firstName: "Luis",  lastName: "Tan",      isOnline: true  },
    listing: { id: "l6", title: "Home Plumbing Repair",      price: 800,   priceUnit: "/ visit", listingType: "SERVICE", status: "AVAILABLE" },
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  "conv-1": [
    { id: "m1", conversationId: "conv-1", senderId: "u2",  content: "Hi! Is the Sony A7III still available?",       status: "READ",      createdAt: new Date(Date.now() - 40 * 60000).toISOString() },
    { id: "m2", conversationId: "conv-1", senderId: "me",  content: "Yes it is! Great condition, barely used.",      status: "READ",      createdAt: new Date(Date.now() - 38 * 60000).toISOString() },
    { id: "m3", conversationId: "conv-1", senderId: "u2",  content: "Can I see more photos? Especially the body.",   status: "READ",      createdAt: new Date(Date.now() - 36 * 60000).toISOString() },
    { id: "m4", conversationId: "conv-1", senderId: "me",  content: "Sure, I'll send more later today.",             status: "DELIVERED", createdAt: new Date(Date.now() - 35 * 60000).toISOString() },
    { id: "m5", conversationId: "conv-1", senderId: "u2",  content: "Is the price still negotiable?",                status: "SENT",      createdAt: new Date(Date.now() - 2  * 60000).toISOString() },
  ],
  "conv-2": [
    { id: "m6",  conversationId: "conv-2", senderId: "u3", content: "Good morning! Is the bike available this weekend?", status: "READ", createdAt: new Date(Date.now() - 90 * 60000).toISOString() },
    { id: "m7",  conversationId: "conv-2", senderId: "me", content: "Yes, Saturday and Sunday are free!",                status: "READ", createdAt: new Date(Date.now() - 85 * 60000).toISOString() },
    { id: "m8",  conversationId: "conv-2", senderId: "u3", content: "Perfect. Does it come with a helmet?",              status: "READ", createdAt: new Date(Date.now() - 80 * 60000).toISOString() },
    { id: "m9",  conversationId: "conv-2", senderId: "me", content: "Yes, I'll include a helmet and lock.",              status: "READ", createdAt: new Date(Date.now() - 75 * 60000).toISOString() },
    { id: "m10", conversationId: "conv-2", senderId: "u3", content: "I'll pick it up Saturday morning.",                 status: "READ", createdAt: new Date(Date.now() - 15 * 60000).toISOString() },
  ],
  "conv-3": [
    { id: "m11", conversationId: "conv-3", senderId: "u4", content: "Hello! My laptop is very slow. Can you check it?", status: "READ", createdAt: new Date(Date.now() - 26 * 3600000).toISOString() },
    { id: "m12", conversationId: "conv-3", senderId: "me", content: "Sure! What's the brand and model?",                status: "READ", createdAt: new Date(Date.now() - 25 * 3600000).toISOString() },
    { id: "m13", conversationId: "conv-3", senderId: "u4", content: "It's a Lenovo IdeaPad, 2019 model.",               status: "READ", createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
    { id: "m14", conversationId: "conv-3", senderId: "me", content: "Okay, I'll diagnose it for ₱200. Upgrade depends on what's needed.", status: "READ", createdAt: new Date(Date.now() - 23 * 3600000).toISOString() },
    { id: "m15", conversationId: "conv-3", senderId: "u4", content: "The SSD upgrade is done. Ready for pickup!",       status: "SENT", createdAt: new Date(Date.now() - 60 * 60000).toISOString() },
  ],
  "conv-4": [
    { id: "m16", conversationId: "conv-4", senderId: "u5", content: "Is the iPhone 14 Pro still available?", status: "READ", createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    { id: "m17", conversationId: "conv-4", senderId: "me", content: "Yes! Box open but never used.",         status: "READ", createdAt: new Date(Date.now() - 4 * 3600000).toISOString() },
    { id: "m18", conversationId: "conv-4", senderId: "u5", content: "Can you do COD?",                       status: "READ", createdAt: new Date(Date.now() - 3 * 3600000).toISOString() },
  ],
  "conv-5": [
    { id: "m19", conversationId: "conv-5", senderId: "u6", content: "Hi! Is the 50mm lens free this Saturday?", status: "READ", createdAt: new Date(Date.now() - 7 * 3600000).toISOString() },
    { id: "m20", conversationId: "conv-5", senderId: "me", content: "Yes it's available!",                      status: "READ", createdAt: new Date(Date.now() - 6 * 3600000).toISOString() },
    { id: "m21", conversationId: "conv-5", senderId: "u6", content: "Thanks! I'll return it Monday.",           status: "READ", createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
  ],
  "conv-6": [
    { id: "m22", conversationId: "conv-6", senderId: "u7", content: "Hi, I need a leaking pipe fixed.",             status: "READ", createdAt: new Date(Date.now() - 26 * 3600000).toISOString() },
    { id: "m23", conversationId: "conv-6", senderId: "me", content: "Sure! Where is the leak located?",             status: "READ", createdAt: new Date(Date.now() - 25 * 3600000).toISOString() },
    { id: "m24", conversationId: "conv-6", senderId: "u7", content: "Under the kitchen sink.",                      status: "READ", createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
    { id: "m25", conversationId: "conv-6", senderId: "me", content: "I can come by Wednesday at 2pm.",              status: "READ", createdAt: new Date(Date.now() - 23 * 3600000).toISOString() },
  ],
};

// ─── Storage keys for persisted mock data ─────────────────────────────────────

const CONV_KEY = "mock_conversations_v1";
const MSG_KEY  = "mock_messages_v1";

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return MOCK_CONVERSATIONS;
  try {
    const raw = localStorage.getItem(CONV_KEY);
    return raw ? JSON.parse(raw) : MOCK_CONVERSATIONS;
  } catch {
    return MOCK_CONVERSATIONS;
  }
}

function saveConversations(convs: Conversation[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONV_KEY, JSON.stringify(convs));
}

function loadMessages(): Record<string, Message[]> {
  if (typeof window === "undefined") return MOCK_MESSAGES;
  try {
    const raw = localStorage.getItem(MSG_KEY);
    return raw ? JSON.parse(raw) : MOCK_MESSAGES;
  } catch {
    return MOCK_MESSAGES;
  }
}

function saveMessages(msgs: Record<string, Message[]>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MSG_KEY, JSON.stringify(msgs));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch all conversations for the current user.
 * TODO: replace body with → const res = await apiFetch("/conversations"); return (await res.json()).data;
 */
export async function getConversations(): Promise<Conversation[]> {
  return loadConversations();
}

/**
 * Fetch a single conversation by id.
 * TODO: const res = await apiFetch(`/conversations/${id}`); return (await res.json()).data;
 */
export async function getConversation(id: string): Promise<Conversation | null> {
  const all = loadConversations();
  return all.find((c) => c.id === id) ?? null;
}

/**
 * Fetch all messages in a conversation.
 * TODO: const res = await apiFetch(`/conversations/${conversationId}/messages`); return (await res.json()).data;
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  const all = loadMessages();
  return all[conversationId] ?? [];
}

/**
 * Send a new message.
 * TODO: const res = await apiFetch(`/conversations/${conversationId}/messages`, { method:"POST", body: JSON.stringify({ content }) });
 */
export async function sendMessage(conversationId: string, content: string, currentUserId: string): Promise<Message> {
  const newMsg: Message = {
    id: `msg-${Date.now()}`,
    conversationId,
    senderId: currentUserId,
    content,
    status: "SENT",
    createdAt: new Date().toISOString(),
  };

  // Persist messages
  const allMsgs = loadMessages();
  allMsgs[conversationId] = [...(allMsgs[conversationId] ?? []), newMsg];
  saveMessages(allMsgs);

  // Update conversation's lastMessage
  const allConvs = loadConversations();
  const idx = allConvs.findIndex((c) => c.id === conversationId);
  if (idx !== -1) {
    allConvs[idx] = { ...allConvs[idx], lastMessage: content, lastMessageAt: newMsg.createdAt, unreadCount: 0 };
    saveConversations(allConvs);
  }

  return newMsg;
}

/**
 * Mark all messages in a conversation as read.
 * TODO: await apiFetch(`/conversations/${conversationId}/read`, { method: "PATCH" });
 */
export async function markConversationRead(conversationId: string): Promise<void> {
  const allConvs = loadConversations();
  const idx = allConvs.findIndex((c) => c.id === conversationId);
  if (idx !== -1) {
    allConvs[idx] = { ...allConvs[idx], unreadCount: 0 };
    saveConversations(allConvs);
  }
}

/**
 * Delete / archive a conversation.
 * TODO: await apiFetch(`/conversations/${conversationId}`, { method: "DELETE" });
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const allConvs = loadConversations().filter((c) => c.id !== conversationId);
  saveConversations(allConvs);
}
