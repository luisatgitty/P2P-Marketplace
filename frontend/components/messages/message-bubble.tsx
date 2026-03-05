"use client";

export interface MessageBubbleProps {
  id: string;
  content: string;
  senderName: string;
  senderId: string;
  timestamp: Date;
  isOwn: boolean;
  senderAvatar?: string;
}

export const MessageBubble = ({
  content,
  senderName,
  isOwn,
  timestamp,
  senderAvatar,
}: MessageBubbleProps) => {
  const timeStr = new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div
      className={`flex gap-3 mb-4 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
    >
      {!isOwn && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
          {senderAvatar || senderName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
        {!isOwn && (
          <span className="text-xs text-gray-500 font-medium mb-1">
            {senderName}
          </span>
        )}
        <div
          className={`px-4 py-2 rounded-lg max-w-xs word-wrap ${
            isOwn
              ? "bg-blue-600 text-white rounded-br-none"
              : "bg-gray-200 text-gray-900 rounded-bl-none"
          }`}
        >
          <p className="text-sm">{content}</p>
        </div>
        <span className="text-xs text-gray-500 mt-1">{timeStr}</span>
      </div>
    </div>
  );
};
