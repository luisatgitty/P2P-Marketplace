"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation, MessageTab } from "@/types/messaging";
import { getConversationsPage } from "@/services/messagingService";
import ConversationItem from "./conversation-item";
import EmptyState from "./empty-state";

interface ConversationsListProps {
  activeTab: MessageTab;
}

export default function ConversationsList({ activeTab }: ConversationsListProps) {
  const PAGE_SIZE = 15;
  const pathname     = usePathname();
  const activeConvId = pathname.startsWith("/messages/") ? pathname.split("/")[2] : null;

  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const listViewportRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  const loadConvs = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) {
      setLoading(true);
    }

    try {
      const page = await getConversationsPage({
        limit: PAGE_SIZE,
        offset: 0,
        tab: activeTab,
        search: searchQuery,
      });
      setAllConversations(page.conversations);
      setTotalCount(page.total);
      setHasMore(page.offset + page.conversations.length < page.total);
    } catch {
      if (showSkeleton) {
        setAllConversations([]);
        setTotalCount(0);
        setHasMore(false);
      }
    } finally {
      if (showSkeleton) {
        setLoading(false);
      }
    }
  }, [PAGE_SIZE, activeTab, searchQuery]);

  const loadMoreConvs = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const page = await getConversationsPage({
        limit: PAGE_SIZE,
        offset: allConversations.length,
        tab: activeTab,
        search: searchQuery,
      });

      setAllConversations((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const deduped = page.conversations.filter((item) => !seen.has(item.id));
        return [...prev, ...deduped];
      });

      setTotalCount(page.total);
      const nextCount = allConversations.length + page.conversations.length;
      setHasMore(nextCount < page.total);
    } finally {
      setLoadingMore(false);
    }
  }, [PAGE_SIZE, activeTab, allConversations.length, hasMore, loading, loadingMore, searchQuery]);

  useEffect(() => { loadConvs(true); }, [loadConvs]);

  useEffect(() => {
    const refresh = async () => {
      const refreshLimit = Math.max(PAGE_SIZE, allConversations.length || PAGE_SIZE);
      const page = await getConversationsPage({
        limit: refreshLimit,
        offset: 0,
        tab: activeTab,
        search: searchQuery,
      });
      setAllConversations(page.conversations);
      setTotalCount(page.total);
      setHasMore(page.offset + page.conversations.length < page.total);
    };

    window.addEventListener("messages:updated", refresh);
    return () => window.removeEventListener("messages:updated", refresh);
  }, [PAGE_SIZE, activeTab, allConversations.length, searchQuery]);

  const filtered = allConversations;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(search.trim());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;
    if (filtered.length > 0) return;
    void loadMoreConvs();
  }, [filtered.length, hasMore, loadMoreConvs, loading, loadingMore]);

  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;

    const root = listViewportRef.current;
    const target = loadMoreTriggerRef.current;
    if (!root || !target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        void loadMoreConvs();
      },
      {
        root,
        rootMargin: "160px 0px",
        threshold: 0.1,
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMoreConvs, loading, loadingMore]);

  return (
    <div className="flex flex-col h-full pb-16">

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
                "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
                "[&::-ms-clear]:hidden [&::-ms-reveal]:hidden",
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
      <div ref={listViewportRef} className="flex-1 overflow-y-auto no-scroll">
        {loading ? (

          // Skeleton — staggered fade-in so it feels intentional
          <div className="flex flex-col gap-0 animate-in fade-in duration-150">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-3 border-l-2 border-l-transparent animate-in fade-in duration-300"
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
              >
                <div className="w-11 h-11 rounded-full bg-stone-100 dark:bg-[#252837] animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 rounded bg-stone-100 dark:bg-[#252837] animate-pulse" />
                  <div className="h-2.5 w-48 rounded bg-stone-100 dark:bg-[#252837] animate-pulse" />
                  <div className="h-2.5 w-40 rounded bg-stone-100 dark:bg-[#252837] animate-pulse" />
                </div>
              </div>
            ))}
          </div>

        ) : (

          <div
            className="divide-y divide-border/50 animate-in fade-in duration-300 ease-out"
          >
            {filtered.length === 0 ? (
              <EmptyState tab={activeTab} hasSearch={!!search} />
            ) : (
              filtered.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === activeConvId}
                />
              ))
            )}

            {!search.trim() && hasMore && (
              <div
                ref={loadMoreTriggerRef}
                className="px-4 py-3 text-center text-xs text-stone-400 dark:text-stone-500"
              >
                {loadingMore ? "Loading more conversations..." : "Scroll to load more"}
              </div>
            )}

            {!hasMore && totalCount > PAGE_SIZE && (
              <div className="px-4 py-3 text-center text-xs text-stone-400 dark:text-stone-500">
                End of conversations.
              </div>
            )}
          </div>

        )}
      </div>
    </div>
  );
}
