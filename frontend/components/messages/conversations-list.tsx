"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation, MessageTab } from "@/types/messaging";
import { getConversations } from "@/services/messagingService";
import ConversationItem from "./conversation-item";
import EmptyState from "./empty-state";

// ─── Tab filter logic ─────────────────────────────────────────────────────────

function filterByTab(conversations: Conversation[], tab: MessageTab): Conversation[] {
  switch (tab) {
    case "buying":   return conversations.filter((c) => !c.isSeller && c.listing.listingType === "SELL");
    case "selling":  return conversations.filter((c) =>  c.isSeller && c.listing.listingType === "SELL");
    case "rental":   return conversations.filter((c) => c.listing.listingType === "RENT");
    case "services": return conversations.filter((c) => c.listing.listingType === "SERVICE");
    default:         return conversations; // "all"
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ConversationsListProps {
  activeTab: MessageTab;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ConversationsList({ activeTab }: ConversationsListProps) {
  const pathname   = usePathname();
  const activeConvId = pathname.startsWith("/messages/") ? pathname.split("/")[2] : null;

  const [allConversations, setAllConversations]   = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadConvs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getConversations();
      setAllConversations(data);
    } catch {
      setAllConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConvs(); }, [loadConvs]);

  useEffect(() => {
    const refresh = () => {
      loadConvs();
    };

    window.addEventListener("messages:updated", refresh);
    return () => window.removeEventListener("messages:updated", refresh);
  }, [loadConvs]);

  const tabFiltered = filterByTab(allConversations, activeTab);

  const filtered = search.trim()
    ? tabFiltered.filter((c) =>
        [
          `${c.otherParticipant.firstName} ${c.otherParticipant.lastName}`,
          c.listing.title,
          c.lastMessage ?? "",
        ].some((s) => s.toLowerCase().includes(search.toLowerCase()))
      )
    : tabFiltered;

  return (
    <div className="flex flex-col h-full">

      {/* ── Search bar ──────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 pointer-events-none"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className={cn(
                "w-full pl-8 pr-7 py-2 text-xs rounded-lg bg-stone-100 dark:bg-[#13151f] border border-transparent",
                "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none", // Remove default "x" button in WebKit browsers
                "[&::-ms-clear]:hidden [&::-ms-reveal]:hidden", // Remove default "x" button in IE/Edge
                "placeholder:text-stone-400 dark:placeholder:text-stone-600",
                "text-stone-800 dark:text-stone-100",
                "focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50",
                "transition-all"
              )}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── List ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto no-scroll">
        {loading ? (
          // Skeleton
          <div className="flex flex-col gap-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 border-l-2 border-l-transparent">
                <div className="w-11 h-11 rounded-full bg-stone-100 dark:bg-[#252837] animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 rounded bg-stone-100 dark:bg-[#252837] animate-pulse" />
                  <div className="h-2.5 w-48 rounded bg-stone-100 dark:bg-[#252837] animate-pulse" />
                  <div className="h-2.5 w-40 rounded bg-stone-100 dark:bg-[#252837] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState tab={activeTab} hasSearch={!!search} />
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConvId}
                showTypeBadge={activeTab === "all"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
