"use client";

import { Conversation, ConversationsList } from "@/components/messages/conversations-list";

// Mock conversations - replace with API call
const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "1",
    userName: "Juan dela Cruz",
    lastMessage: "Is this still available?",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    unreadCount: 2,
    listingTitle: "Casio G-Shock GA-2100",
  },
  {
    id: "2",
    userName: "Maria Santos",
    lastMessage: "Can you show me more photos?",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    unreadCount: 0,
    listingTitle: "Studio Unit — Makati CBD",
  },
  {
    id: "3",
    userName: "Pedro Reyes",
    lastMessage: "Thanks for the repair!",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    unreadCount: 0,
    listingTitle: "Aircon Cleaning & Repair",
  },
  {
    id: "4",
    userName: "Ana Reyes",
    lastMessage: "When can you deliver?",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    unreadCount: 1,
    listingTitle: "MacBook Pro M2 2023",
  },
];

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const activeId = children?.props?.params?.userId;

  return (
    <div className="h-[calc(100vh-80px)] flex bg-gray-50">
      <ConversationsList conversations={MOCK_CONVERSATIONS} activeId={activeId} />
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
