"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

export interface ConversationItemProps {
  id: string;
  userName: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  userAvatar?: string;
  active?: boolean;
  listingTitle?: string;
}

export const ConversationItem = ({
  id,
  userName,
  lastMessage,
  timestamp,
  unreadCount,
  userAvatar,
  active = false,
  listingTitle,
}: ConversationItemProps) => {
  const timeStr = formatMessageTime(new Date(timestamp));

  return (
    <Link
      href={`/messages/${id}`}
      className={`block p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
        active ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
      }`}
    >
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
          {userAvatar || userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div>
              <h3 className="font-semibold text-gray-900">{userName}</h3>
              {listingTitle && (
                <p className="text-xs text-gray-500">{listingTitle}</p>
              )}
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {timeStr}
            </span>
          </div>
          <p
            className={`text-sm text-gray-600 truncate ${
              unreadCount > 0 ? "font-semibold text-gray-900" : ""
            }`}
          >
            {lastMessage}
          </p>
        </div>
        {unreadCount > 0 && (
          <div className="bg-blue-600 text-white text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </div>
    </Link>
  );
};

function formatMessageTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
