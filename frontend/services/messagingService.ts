/**
 * messagingService.ts — mock-first, API-ready
 * Follows the same fetch pattern as authService.ts.
 * Swap the mock bodies for real API calls when the Go backend is ready.
 */

import type {
  Conversation,
  Message,
  ReactionType,
  ReplyPreview,
} from "@/types/messaging";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

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
    id: "conv-1", isSeller: false,
    lastMessage: "Is the price still negotiable?",
    lastMessageAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    unreadCount: 2,
    otherParticipant: { id: "u2", firstName: "Maria",  lastName: "Santos",    isOnline: true  },
    listing: { id: "l1", title: "Sony A7III Camera",        price: 45_000,              listingType: "SELL",    status: "AVAILABLE" },
  },
  {
    id: "conv-2", isSeller: false,
    lastMessage: "I'll pick it up Saturday morning.",
    lastMessageAt: new Date(Date.now() - 15 * 60_000).toISOString(),
    unreadCount: 0,
    otherParticipant: { id: "u3", firstName: "Jun",    lastName: "dela Cruz", isOnline: false },
    listing: { id: "l2", title: "Mountain Bike (Weekend)",  price: 800,    priceUnit: "/ day", listingType: "RENT",    status: "AVAILABLE" },
  },
  {
    id: "conv-3", isSeller: true,
    lastMessage: "The SSD upgrade is done. Ready for pickup!",
    lastMessageAt: new Date(Date.now() - 60 * 60_000).toISOString(),
    unreadCount: 1,
    otherParticipant: { id: "u4", firstName: "Carlo",  lastName: "Reyes",    isOnline: true  },
    listing: { id: "l3", title: "Laptop Repair & Upgrade",  price: 500,    priceUnit: "+",     listingType: "SERVICE", status: "AVAILABLE" },
  },
  {
    id: "conv-4", isSeller: false,
    lastMessage: "Can you do COD?",
    lastMessageAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    unreadCount: 0,
    otherParticipant: { id: "u5", firstName: "Ana",    lastName: "Villanueva", isOnline: false },
    listing: { id: "l4", title: "iPhone 14 Pro — Midnight", price: 52_000,             listingType: "SELL",    status: "AVAILABLE" },
  },
  {
    id: "conv-5", isSeller: true,
    lastMessage: "Thanks! I'll return it Monday.",
    lastMessageAt: new Date(Date.now() - 5 * 3_600_000).toISOString(),
    unreadCount: 0,
    otherParticipant: { id: "u6", firstName: "Bea",    lastName: "Gutierrez", isOnline: false },
    listing: { id: "l5", title: "DSLR Lens 50mm f/1.4",     price: 300,    priceUnit: "/ day", listingType: "RENT",    status: "AVAILABLE" },
  },
  {
    id: "conv-6", isSeller: false,
    lastMessage: "I can come by Wednesday at 2pm.",
    lastMessageAt: new Date(Date.now() - 24 * 3_600_000).toISOString(),
    unreadCount: 0,
    otherParticipant: { id: "u7", firstName: "Luis",   lastName: "Tan",      isOnline: true  },
    listing: { id: "l6", title: "Home Plumbing Repair",      price: 800,    priceUnit: "/ visit", listingType: "SERVICE", status: "AVAILABLE" },
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  "conv-1": [
    {
      id: "m1", conversationId: "conv-1", senderId: "u2",
      content: "Hi! Is the Sony A7III still available?",
      status: "READ", createdAt: new Date(Date.now() - 40 * 60_000).toISOString(),
    },
    {
      id: "m2", conversationId: "conv-1", senderId: "me",
      content: "Yes it is! Great condition, barely used. Here are some photos:",
      status: "READ", createdAt: new Date(Date.now() - 38 * 60_000).toISOString(),
      // Two photos
      attachments: [
        { id: "a1", fileUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80", fileType: "IMAGE", fileName: "camera-front.jpg" },
        { id: "a2", fileUrl: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80", fileType: "IMAGE", fileName: "camera-back.jpg" },
      ],
    },
    {
      id: "m3", conversationId: "conv-1", senderId: "u2",
      content: "Wow, looks great! Can I see more?",
      status: "READ", createdAt: new Date(Date.now() - 36 * 60_000).toISOString(),
      reactions: [{ userId: "me", type: "LOVE" }],
    },
    {
      id: "m4", conversationId: "conv-1", senderId: "me",
      content: "Sure! Here are 3 more angles:",
      status: "READ", createdAt: new Date(Date.now() - 35 * 60_000).toISOString(),
      // Three photos — triggers the 3-image grid
      attachments: [
        { id: "a3", fileUrl: "https://images.unsplash.com/photo-1581591524425-c7e0978865fc?w=600&q=80", fileType: "IMAGE", fileName: "cam1.jpg" },
        { id: "a4", fileUrl: "https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?w=600&q=80", fileType: "IMAGE", fileName: "cam2.jpg" },
        { id: "a5", fileUrl: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=600&q=80", fileType: "IMAGE", fileName: "cam3.jpg" },
      ],
    },
    {
      id: "m5", conversationId: "conv-1", senderId: "u2",
      content: "Is the price still negotiable?",
      status: "SENT", createdAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    },
  ],
  "conv-2": [
    { id: "m6",  conversationId: "conv-2", senderId: "u3", content: "Good morning! Is the bike available this weekend?", status: "READ", createdAt: new Date(Date.now() - 90 * 60_000).toISOString() },
    { id: "m7",  conversationId: "conv-2", senderId: "me", content: "Yes, Saturday and Sunday are free!",                status: "READ", createdAt: new Date(Date.now() - 85 * 60_000).toISOString() },
    { id: "m8",  conversationId: "conv-2", senderId: "u3", content: "Perfect. Does it come with a helmet?",              status: "READ", createdAt: new Date(Date.now() - 80 * 60_000).toISOString() },
    {
      id: "m9", conversationId: "conv-2", senderId: "me",
      content: "Yes, I'll include a helmet and lock.",
      status: "READ", createdAt: new Date(Date.now() - 75 * 60_000).toISOString(),
      reactions: [{ userId: "u3", type: "LIKE" }],
    },
    {
      id: "m10", conversationId: "conv-2", senderId: "u3",
      content: "I'll pick it up Saturday morning.",
      status: "READ", createdAt: new Date(Date.now() - 15 * 60_000).toISOString(),
      // Example reply
      replyTo: { messageId: "m9", senderId: "me", senderName: "You", contentPreview: "Yes, I'll include a helmet and lock." },
    },
  ],
  "conv-3": [
    { id: "m11", conversationId: "conv-3", senderId: "u4", content: "Hello! My laptop is very slow. Can you check it?", status: "READ", createdAt: new Date(Date.now() - 26 * 3_600_000).toISOString() },
    { id: "m12", conversationId: "conv-3", senderId: "me", content: "Sure! What's the brand and model?",                status: "READ", createdAt: new Date(Date.now() - 25 * 3_600_000).toISOString() },
    { id: "m13", conversationId: "conv-3", senderId: "u4", content: "It's a Lenovo IdeaPad, 2019 model.",               status: "READ", createdAt: new Date(Date.now() - 24 * 3_600_000).toISOString() },
    { id: "m14", conversationId: "conv-3", senderId: "me", content: "Alright. Here is a short demo video of the issue I diagnosed:", status: "READ", createdAt: new Date(Date.now() - 23 * 3_600_000).toISOString(),
      // Mixed: 1 video + 1 image
      attachments: [
        { id: "av1", fileUrl: "https://www.w3schools.com/html/mov_bbb.mp4",                                               fileType: "VIDEO", fileName: "diagnosis.mp4" },
        { id: "ai1", fileUrl: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&q=80", fileType: "IMAGE", fileName: "screenshot.jpg" },
      ],
    },
    { id: "m15", conversationId: "conv-3", senderId: "u4", content: "The SSD upgrade is done. Ready for pickup!",       status: "SENT", createdAt: new Date(Date.now() - 60 * 60_000).toISOString() },
  ],
  "conv-4": [
    { id: "m16", conversationId: "conv-4", senderId: "u5", content: "Is the iPhone 14 Pro still available?", status: "READ", createdAt: new Date(Date.now() - 5 * 3_600_000).toISOString() },
    { id: "m17", conversationId: "conv-4", senderId: "me", content: "Yes! Box open but never used.",         status: "READ", createdAt: new Date(Date.now() - 4 * 3_600_000).toISOString() },
    { id: "m18", conversationId: "conv-4", senderId: "u5", content: "Can you do COD?",                       status: "READ", createdAt: new Date(Date.now() - 3 * 3_600_000).toISOString() },
  ],
  "conv-5": [
    { id: "m19", conversationId: "conv-5", senderId: "u6", content: "Hi! Is the 50mm lens free this Saturday?", status: "READ", createdAt: new Date(Date.now() - 7 * 3_600_000).toISOString() },
    { id: "m20", conversationId: "conv-5", senderId: "me", content: "Yes it's available!",                      status: "READ", createdAt: new Date(Date.now() - 6 * 3_600_000).toISOString() },
    { id: "m21", conversationId: "conv-5", senderId: "u6", content: "Thanks! I'll return it Monday.",           status: "READ", createdAt: new Date(Date.now() - 5 * 3_600_000).toISOString() },
  ],
  "conv-6": [
    { id: "m22", conversationId: "conv-6", senderId: "u7", content: "Hi, I need a leaking pipe fixed.",    status: "READ", createdAt: new Date(Date.now() - 26 * 3_600_000).toISOString() },
    { id: "m23", conversationId: "conv-6", senderId: "me", content: "Sure! Where is the leak located?",    status: "READ", createdAt: new Date(Date.now() - 25 * 3_600_000).toISOString() },
    { id: "m24", conversationId: "conv-6", senderId: "u7", content: "Under the kitchen sink.",             status: "READ", createdAt: new Date(Date.now() - 24 * 3_600_000).toISOString() },
    { id: "m25", conversationId: "conv-6", senderId: "me", content: "I can come by Wednesday at 2pm.",     status: "READ", createdAt: new Date(Date.now() - 23 * 3_600_000).toISOString() },
  ],
};

// ─── localStorage persistence ─────────────────────────────────────────────────

const CONV_KEY = "mock_conversations_v2";
const MSG_KEY  = "mock_messages_v2";

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return MOCK_CONVERSATIONS;
  try {
    const raw = localStorage.getItem(CONV_KEY);
    return raw ? JSON.parse(raw) : MOCK_CONVERSATIONS;
  } catch { return MOCK_CONVERSATIONS; }
}

function saveConversations(convs: Conversation[]) {
  if (typeof window !== "undefined")
    localStorage.setItem(CONV_KEY, JSON.stringify(convs));
}

function loadMessages(): Record<string, Message[]> {
  if (typeof window === "undefined") return MOCK_MESSAGES;
  try {
    const raw = localStorage.getItem(MSG_KEY);
    return raw ? JSON.parse(raw) : MOCK_MESSAGES;
  } catch { return MOCK_MESSAGES; }
}

function saveMessages(msgs: Record<string, Message[]>) {
  if (typeof window !== "undefined")
    localStorage.setItem(MSG_KEY, JSON.stringify(msgs));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** GET /conversations */
export async function getConversations(): Promise<Conversation[]> {
  return loadConversations();
}

/** GET /conversations/:id */
export async function getConversation(id: string): Promise<Conversation | null> {
  return loadConversations().find((c) => c.id === id) ?? null;
}

/** GET /conversations/:id/messages */
export async function getMessages(conversationId: string): Promise<Message[]> {
  return loadMessages()[conversationId] ?? [];
}

/** POST /conversations/:id/messages */
export async function sendMessage(
  conversationId: string,
  content: string,
  currentUserId: string,
  replyTo?: ReplyPreview | null,
): Promise<Message> {
  const newMsg: Message = {
    id: `msg-${Date.now()}`,
    conversationId,
    senderId: currentUserId,
    content,
    status: "SENT",
    replyTo: replyTo ?? null,
    createdAt: new Date().toISOString(),
  };
  const allMsgs = loadMessages();
  allMsgs[conversationId] = [...(allMsgs[conversationId] ?? []), newMsg];
  saveMessages(allMsgs);

  const allConvs = loadConversations();
  const idx = allConvs.findIndex((c) => c.id === conversationId);
  if (idx !== -1) {
    allConvs[idx] = { ...allConvs[idx], lastMessage: content, lastMessageAt: newMsg.createdAt, unreadCount: 0 };
    saveConversations(allConvs);
  }
  return newMsg;
}

/** PATCH /messages/:id/react */
export async function reactToMessage(
  conversationId: string,
  messageId: string,
  userId: string,
  reaction: ReactionType | null,   // null = remove reaction
): Promise<void> {
  const allMsgs = loadMessages();
  const msgs = allMsgs[conversationId] ?? [];
  allMsgs[conversationId] = msgs.map((m) => {
    if (m.id !== messageId) return m;
    const existing = (m.reactions ?? []).filter((r) => r.userId !== userId);
    return {
      ...m,
      reactions: reaction ? [...existing, { userId, type: reaction }] : existing,
    };
  });
  saveMessages(allMsgs);
}

/** PATCH /messages/:id — edit content */
export async function editMessage(
  conversationId: string,
  messageId: string,
  newContent: string,
): Promise<void> {
  const allMsgs = loadMessages();
  allMsgs[conversationId] = (allMsgs[conversationId] ?? []).map((m) =>
    m.id === messageId ? { ...m, content: newContent, isEdited: true } : m
  );
  saveMessages(allMsgs);
}

/** DELETE /messages/:id  — unsend (sender) or local delete (receiver) */
export async function deleteMessage(
  conversationId: string,
  messageId: string,
  unsend: boolean,   // true = mark isUnsent for all; false = remove locally
): Promise<void> {
  const allMsgs = loadMessages();
  if (unsend) {
    allMsgs[conversationId] = (allMsgs[conversationId] ?? []).map((m) =>
      m.id === messageId ? { ...m, isUnsent: true, content: undefined, attachments: [] } : m
    );
  } else {
    allMsgs[conversationId] = (allMsgs[conversationId] ?? []).filter((m) => m.id !== messageId);
  }
  saveMessages(allMsgs);
}

/** PATCH /conversations/:id/read */
export async function markConversationRead(conversationId: string): Promise<void> {
  const all = loadConversations();
  const idx = all.findIndex((c) => c.id === conversationId);
  if (idx !== -1) { all[idx] = { ...all[idx], unreadCount: 0 }; saveConversations(all); }
}

/** DELETE /conversations/:id */
export async function deleteConversation(conversationId: string): Promise<void> {
  saveConversations(loadConversations().filter((c) => c.id !== conversationId));
}
