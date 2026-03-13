import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/messaging";

interface MessageBubbleProps {
  message: Message;
  /** The logged-in user's id — used to determine if bubble is "sent" or "received" */
  currentUserId: string;
  /** Whether to show the time label (e.g. first message in a group) */
  showTime?: boolean;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({ message, currentUserId, showTime }: MessageBubbleProps) {
  const isMe = message.senderId === currentUserId;

  return (
    <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] sm:max-w-[65%]",
          isMe ? "items-end" : "items-start",
          "flex flex-col gap-0.5"
        )}
      >
        <div
          className={cn(
            "px-3.5 py-2.5 text-sm leading-relaxed break-words",
            isMe
              ? "bg-amber-700 text-white rounded-2xl rounded-br-sm shadow-sm"
              : "bg-white dark:bg-[#252837] text-stone-800 dark:text-stone-100 rounded-2xl rounded-bl-sm border border-border shadow-sm"
          )}
        >
          {message.content}
        </div>

        {/* Time + status */}
        {showTime && (
          <div
            className={cn(
              "flex items-center gap-1 text-[10px] text-stone-400 dark:text-stone-500 px-1",
              isMe && "flex-row-reverse"
            )}
          >
            <span>{formatTime(message.createdAt)}</span>
            {isMe && (
              message.status === "READ"      ? <CheckCheck size={11} className="text-amber-500" /> :
              message.status === "DELIVERED" ? <CheckCheck size={11} className="text-stone-400 dark:text-stone-500" /> :
                                              <Check      size={11} className="text-stone-400 dark:text-stone-500" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
