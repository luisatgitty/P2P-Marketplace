"use client";

import { MessageCircle } from "lucide-react";

export default function MessagesPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-white">
      <MessageCircle size={64} className="text-gray-300 mb-4" />
      <h2 className="text-2xl font-semibold text-gray-600 mb-2">
        No conversation selected
      </h2>
      <p className="text-gray-500">
        Select a conversation from the list to start messaging
      </p>
    </div>
  );
}
