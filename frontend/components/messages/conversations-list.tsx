"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { ConversationItem } from "./conversation-item";

export interface Conversation {
  id: string;
  userName: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  userAvatar?: string;
  listingTitle?: string;
}

export interface ConversationsListProps {
  conversations: Conversation[];
  activeId?: string;
}

export const ConversationsList = ({
  conversations,
  activeId,
}: ConversationsListProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) =>
      conv.userName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  const unreadCount = conversations.reduce(
    (sum, conv) => sum + conv.unreadCount,
    0
  );

  return (
    <div className="w-full md:w-80 border-r border-gray-200 flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Messages</h2>
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {unreadCount > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              {...conversation}
              active={activeId === conversation.id}
            />
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-center text-sm">
              {searchQuery ? "No conversations found" : "No conversations yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
