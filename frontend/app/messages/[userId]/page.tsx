"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeft, MoreVertical } from "lucide-react";
import Link from "next/link";
import { MessageBubble } from "@/components/messages/message-bubble";
import { MessageInput } from "@/components/messages/message-input";

export interface Message {
  id: string;
  content: string;
  senderName: string;
  senderId: string;
  timestamp: Date;
}

interface ConversationPageProps {
  params: {
    userId: string;
  };
}

// Mock conversations data
const MOCK_DATA: Record<
  string,
  {
    userName: string;
    listingTitle: string;
    listingId: string;
    messages: Message[];
  }
> = {
  "1": {
    userName: "Juan dela Cruz",
    listingTitle: "Casio G-Shock GA-2100",
    listingId: "1",
    messages: [
      {
        id: "1",
        content: "Hi, is this watch still available?",
        senderName: "Juan dela Cruz",
        senderId: "user-1",
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
      },
      {
        id: "2",
        content: "Yes, it's still available! Interested?",
        senderName: "You",
        senderId: "current-user",
        timestamp: new Date(Date.now() - 25 * 60 * 1000),
      },
      {
        id: "3",
        content: "Is this still available?",
        senderName: "Juan dela Cruz",
        senderId: "user-1",
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
      },
    ],
  },
  "2": {
    userName: "Maria Santos",
    listingTitle: "Studio Unit — Makati CBD",
    listingId: "2",
    messages: [
      {
        id: "1",
        content: "Hello! I'm interested in the studio unit.",
        senderName: "Maria Santos",
        senderId: "user-2",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        id: "2",
        content: "Great! When would you like to visit?",
        senderName: "You",
        senderId: "current-user",
        timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
      },
      {
        id: "3",
        content: "Can you show me more photos?",
        senderName: "Maria Santos",
        senderId: "user-2",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    ],
  },
  "3": {
    userName: "Pedro Reyes",
    listingTitle: "Aircon Cleaning & Repair",
    listingId: "3",
    messages: [
      {
        id: "1",
        content: "Hi, can you help with my AC unit?",
        senderName: "You",
        senderId: "current-user",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        id: "2",
        content: "Yes, I can help! What's the issue?",
        senderName: "Pedro Reyes",
        senderId: "user-3",
        timestamp: new Date(Date.now() - 23.5 * 60 * 60 * 1000),
      },
      {
        id: "3",
        content: "Thanks for the repair!",
        senderName: "Pedro Reyes",
        senderId: "user-3",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    ],
  },
  "4": {
    userName: "Ana Reyes",
    listingTitle: "MacBook Pro M2 2023",
    listingId: "4",
    messages: [
      {
        id: "1",
        content: "Is the MacBook still available?",
        senderName: "Ana Reyes",
        senderId: "user-4",
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        id: "2",
        content: "Yes! It's in perfect condition.",
        senderName: "You",
        senderId: "current-user",
        timestamp: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000),
      },
      {
        id: "3",
        content: "When can you deliver?",
        senderName: "Ana Reyes",
        senderId: "user-4",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ],
  },
};

export default function ConversationPage({
  params,
}: ConversationPageProps) {
  const data = MOCK_DATA[params.userId] || MOCK_DATA["1"];
  const [messages, setMessages] = useState<Message[]>(data.messages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: (messages.length + 1).toString(),
      content,
      senderName: "You",
      senderId: "current-user",
      timestamp: new Date(),
    };
    setMessages([...messages, newMessage]);
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <Link
            href="/messages"
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="font-semibold text-gray-900">{data.userName}</h2>
            <p className="text-xs text-gray-500">{data.listingTitle}</p>
          </div>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <MoreVertical size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            {...message}
            isOwn={message.senderId === "current-user"}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <MessageInput onSend={handleSendMessage} />
    </div>
  );
}
