"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { MessageTab } from "@/types/messaging";
import MessagesTabNav from "@/components/messages/messages-tab-nav";
import ConversationsList from "@/components/messages/conversations-list";
import ChatHeader from "@/components/messages/chat-header";
import ListingContextCard from "@/components/messages/listing-context-card";
import MessageInput from "@/components/messages/message-input";
import { MessageShellProvider, useMessageShell } from "@/components/messages/message-shell-context";

function ConversationShell({ children }: { children: React.ReactNode }) {
  const { shellState } = useMessageShell();
  const {
    conversation,
    onDelete,
    onMarkedComplete,
    onOfferUpdated,
    onSend,
    inputDisabled,
    replyTo,
    onCancelReply,
  } = shellState;
  const listingStatus = String(conversation?.listing?.status ?? "").trim().toUpperCase();
  const isListingBlocked = listingStatus === "BANNED" || listingStatus === "DELETED";
  const hideListingActionButtons = Boolean(conversation && (conversation.canSendMessage === false || isListingBlocked));
  const canShowInput = Boolean(conversation && conversation.canSendMessage !== false && !isListingBlocked);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#faf6f0] dark:bg-[#0b0f1a]">
      {conversation ? (
        <>
          <ChatHeader conversation={conversation} onDelete={onDelete} onMarkedComplete={onMarkedComplete} />
          <div className="relative flex-1 overflow-hidden">
            <div className="absolute top-2 left-0 right-0 z-20 pointer-events-auto">
              <ListingContextCard
                conversationId={conversation.id}
                listing={conversation.listing}
                isSeller={conversation.isSeller}
                hideActionButtons={hideListingActionButtons}
                onMarkedComplete={onMarkedComplete}
                onOfferUpdated={onOfferUpdated}
              />
            </div>
            {children}
          </div>
          {canShowInput && (
            <MessageInput
              onSend={onSend}
              disabled={inputDisabled}
              replyTo={replyTo}
              onCancelReply={onCancelReply}
              autoFocusKey={conversation.id}
            />
          )}
          <div className="h-14 md:h-0 shrink-0" />
        </>
      ) : (
        children
      )}
    </div>
  );
}

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [activeTab, setActiveTab] = useState<MessageTab>("all");
  
  // On mobile: if we're on a specific conversation, show the chat view full-screen
  const isInConversation = pathname !== "/messages";

  const handleTabChange = (tab: MessageTab) => {
    setActiveTab(tab);
    // On mobile, tapping a tab while in a conversation navigates back to the list
    if (isInConversation) {
      router.push("/messages");
    }
  };

  return (
    <MessageShellProvider>
    <div className="h-[calc(100vh-60px)] flex overflow-hidden bg-[#faf6f0] dark:bg-[#0b0f1a]">

      {/* ══════════════════════════════════════════════
          LEFT — vertical tab sidebar (md+)
      ══════════════════════════════════════════════ */}
      <aside className="hidden md:flex flex-col w-14 lg:w-32 shrink-0 bg-[#1a2235] border-r border-white/5">
        {/* Tab navigation */}
        <div className="flex-1 overflow-hidden pt-1">
          <MessagesTabNav
            activeTab={activeTab}
            onTabChange={handleTabChange}
            orientation="vertical"
          />
        </div>
      </aside>

      {/* ══════════════════════════════════════════════
          MIDDLE — conversations list
          • Always visible on md+
          • On mobile: visible only on /messages, hidden when in a conversation
      ══════════════════════════════════════════════ */}
      <div
        className={cn(
          "flex flex-col border-r border-border bg-[#faf6f0] dark:bg-[#1c1f2e] shrink-0",
          // Width
          "w-full md:w-80",
          // Mobile visibility
          isInConversation ? "hidden md:flex" : "flex"
        )}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h1 className="text-base font-bold text-stone-900 dark:text-stone-50 leading-tight">
              Messages
            </h1>
          </div>
        </div>

        <ConversationsList activeTab={activeTab} />
      </div>

      {/* ══════════════════════════════════════════════
          RIGHT — chat view or empty state
          • Always visible on md+
          • On mobile: visible only when in a conversation
      ══════════════════════════════════════════════ */}
      <div
        className={cn(
          "flex-1 flex flex-col overflow-hidden",
          // Mobile visibility — hide the empty-state on /messages so only the list shows
          !isInConversation && "hidden md:flex"
        )}
      >
        {isInConversation ? <ConversationShell>{children}</ConversationShell> : children}
      </div>

      {/* ══════════════════════════════════════════════
          BOTTOM — mobile-only tab nav
          Always rendered on mobile so users can switch
          categories even while reading a conversation.
      ══════════════════════════════════════════════ */}
      <nav
        aria-label="Message categories"
        className={cn(
          "md:hidden fixed bottom-0 inset-x-0 z-40",
          "bg-[#faf6f0] dark:bg-[#1c1f2e] border-t border-border",
          // Add padding for iOS home indicator
          "pb-safe"
        )}
      >
        <MessagesTabNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          orientation="horizontal"
        />
      </nav>

      {/* Spacer so the content isn't hidden behind the mobile bottom nav */}
      <style>{`
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        }
      `}</style>
    </div>
    </MessageShellProvider>
  );
}
