"use client";

import { MessageSquare, ShoppingCart, Tag, Key, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageTab } from "@/types/messaging";

// ─── Tab definitions ──────────────────────────────────────────────────────────

export const MESSAGE_TABS: {
  id: MessageTab;
  label: string;
  Icon: React.ElementType;
}[] = [
  { id: "all",      label: "All",      Icon: MessageSquare },
  { id: "buying",   label: "Buying",   Icon: ShoppingCart  },
  { id: "selling",  label: "Selling",  Icon: Tag           },
  { id: "rental",   label: "Rental",   Icon: Key           },
  { id: "services", label: "Services", Icon: Wrench        },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface MessagesTabNavProps {
  activeTab: MessageTab;
  onTabChange: (tab: MessageTab) => void;
  /** "vertical" = desktop left sidebar, "horizontal" = mobile bottom bar */
  orientation: "vertical" | "horizontal";
  /** Map of tab → unread count */
  unreadCounts?: Partial<Record<MessageTab, number>>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MessagesTabNav({
  activeTab,
  onTabChange,
  orientation,
  unreadCounts = {},
}: MessagesTabNavProps) {
  const isVertical = orientation === "vertical";

  return (
    <nav
      aria-label="Message categories"
      className={cn(
        isVertical
          ? "flex flex-col gap-0.5 p-2"
          : "flex flex-row"
      )}
    >
      {MESSAGE_TABS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        const count    = unreadCounts[id] ?? 0;

        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-2.5 transition-all duration-150 select-none",
              // ── Vertical (sidebar) ───────────────────────────────────────
              isVertical && [
                "w-full rounded-lg px-3 py-2.5",
                isActive
                  ? "bg-amber-700/20 text-amber-400"
                  : "text-stone-400 hover:bg-white/5 hover:text-stone-200",
              ],
              // ── Horizontal (bottom bar) ──────────────────────────────────
              !isVertical && [
                "flex-1 flex-col gap-0.5 px-1 py-2 text-[10px]",
                isActive
                  ? "text-amber-500"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200",
              ]
            )}
          >
            <div className="relative shrink-0">
              <Icon
                size={isVertical ? 16 : 18}
                className={cn(
                  "shrink-0",
                  isActive && "text-amber-500"
                )}
              />
              {count > 0 && (
                <span className={cn(
                  "absolute flex items-center justify-center rounded-full bg-amber-600 text-white font-bold leading-none",
                  isVertical
                    ? "-top-1.5 -right-1.5 w-4 h-4 text-[9px]"
                    : "-top-1 -right-1.5 w-3.5 h-3.5 text-[8px]"
                )}>
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </div>

            {/* Label */}
            <span
              className={cn(
                "font-semibold leading-none",
                isVertical ? "text-sm hidden lg:inline" : "text-[10px]"
              )}
            >
              {label}
            </span>

            {/* Active indicator for horizontal */}
            {!isVertical && isActive && (
              <span className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full bg-amber-500" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
