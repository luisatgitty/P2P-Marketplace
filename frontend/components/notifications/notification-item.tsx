"use client";

import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, ShieldAlert, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export type NotificationItemData = {
  id: string;
  user_id: string;
  type: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
};

type NotificationItemProps = {
  notification: NotificationItemData;
  onClick?: (id: string) => Promise<void>;
};

function getNotificationIcon(type: string) {
  const normalized = type.toLowerCase();

  if (normalized.includes("message")) {
    return <Bell size={14} className="text-sky-400" />;
  }

  if (normalized.includes("report") || normalized.includes("warning")) {
    return <ShieldAlert size={14} className="text-amber-400" />;
  }

  if (normalized.includes("listing") || normalized.includes("transaction") || normalized.includes("order")) {
    return <ShoppingBag size={14} className="text-emerald-400" />;
  }

  return <CheckCircle2 size={14} className="text-stone-400" />;
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMs = date.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffSec) < 60) return formatter.format(diffSec, "second");

  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return formatter.format(diffMin, "minute");

  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return formatter.format(diffHour, "hour");

  const diffDay = Math.round(diffHour / 24);
  return formatter.format(diffDay, "day");
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const router = useRouter();

  const handleClick = async () => {
    try {
      if (onClick) {
        await onClick(notification.id);
      }
    } catch {
      return;
    }

    const target = notification.link.trim();
    if (/^https?:\/\//i.test(target)) {
      window.location.href = target;
      return;
    }

    router.push(target || "/notifications");
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      className={cn(
        "block w-full text-left px-3 py-2.5 rounded-lg border transition-colors",
        notification.is_read
          ? "border-transparent bg-transparent hover:bg-white/5"
          : "border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/15"
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0 h-6 w-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center">
          {getNotificationIcon(notification.type)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400 truncate">
              {notification.type.replaceAll("_", " ")}
            </p>
            <span className="text-[10px] text-stone-500 shrink-0">{formatRelativeTime(notification.created_at)}</span>
          </div>

          <p className="text-sm text-stone-200 leading-snug mt-0.5 line-clamp-2">{notification.message}</p>
        </div>

        {!notification.is_read && <span className="mt-1 h-2 w-2 rounded-full bg-amber-400 shrink-0" />}
      </div>
    </button>
  );
}
