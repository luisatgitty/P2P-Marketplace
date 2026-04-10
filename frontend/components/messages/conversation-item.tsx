"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/messaging";
import { SafeImage } from "../ui/safe-image";

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days  < 7)  return `${days}d`;
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
}

export default function ConversationItem({
  conversation,
  isActive,
}: ConversationItemProps) {
  const { id, otherParticipant, listing, lastMessage, lastMessageAt, unreadCount } = conversation;
  const hasUnread = unreadCount > 0;
  const fmt = (n: number) => "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 0 });
  const displayPrice = listing.listingType === "SELL" && Number(listing.offer ?? 0) > 0
    ? Number(listing.offer)
    : listing.price;

  return (
    <Link
      href={`/messages/${id}`}
      className={cn(
        "flex items-start gap-3 px-4 py-3 border-l-2 transition-all duration-150 group",
        isActive
          ? "bg-amber-50 dark:bg-amber-900/10 border-l-amber-600"
          : "border-l-transparent hover:bg-stone-50 dark:hover:bg-white/5"
      )}
    >
      {/* Profile Image */}
      <div className="relative w-10 h-10 shrink-0">
        <SafeImage
          src={otherParticipant.profileImageUrl || undefined}
          type="profile"
          alt={`${otherParticipant.firstName} ${otherParticipant.lastName} profile picture`}
          width={36}
          height={36}
        />
        {otherParticipant.isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1c1f2e]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* Row 1: Name + time */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span
            className={cn(
              "text-sm truncate",
              hasUnread
                ? "font-bold text-stone-900 dark:text-stone-50"
                : "font-semibold text-stone-700 dark:text-stone-200"
            )}
          >
            {otherParticipant.firstName} {otherParticipant.lastName}
          </span>
          <span className="text-[11px] text-stone-400 dark:text-stone-500 shrink-0">
            {relativeTime(lastMessageAt)}
          </span>
        </div>

        {/* Row 2: Listing title + price */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[12px] text-stone-400 dark:text-stone-500 truncate">
            {listing.title}
            {" · "}
            <span className="text-amber-600 dark:text-amber-500 font-semibold">
              {fmt(displayPrice)} {listing.priceUnit ?? ""}
            </span>
          </span>
        </div>

        {/* Row 3: Last message + unread badge */}
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-xs truncate",
              hasUnread
                ? "font-semibold text-stone-700 dark:text-stone-200"
                : "text-stone-400 dark:text-stone-500"
            )}
          >
            {lastMessage ?? "No messages yet"}
          </p>
          {hasUnread && (
            <span className="shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-amber-600 text-white text-[10px] font-bold px-1 leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
