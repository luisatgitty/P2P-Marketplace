'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { cn } from '@/lib/utils';

import ChatHeader from './_components/ChatHeader';
import ConversationsList from './_components/ConversationsList';
import MessageInput from './_components/MessageInput';
import ListingContextCard from './_components/ListingContextCard';
import {
  MessageShellProvider,
  useMessageShell,
} from './_components/MessageShellContext';
import MessagesTabNav from './_components/MessagesTabNav';
import type { MessageTab } from './_types/messages';

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
  const listingStatus = String(conversation?.listing?.status ?? '')
    .trim()
    .toUpperCase();
  const isListingBlocked =
    listingStatus === 'BANNED' || listingStatus === 'DELETED';
  const hideListingActionButtons = Boolean(
    conversation && (conversation.canSendMessage === false || isListingBlocked),
  );
  const canShowInput = Boolean(
    conversation && conversation.canSendMessage !== false && !isListingBlocked,
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#faf6f0] dark:bg-[#0b0f1a]">
      {conversation ? (
        <>
          <ChatHeader
            conversation={conversation}
            onDelete={onDelete}
            onMarkedComplete={onMarkedComplete}
            onOfferUpdated={onOfferUpdated}
          />
          <div className="relative flex-1 overflow-hidden">
            <div className="absolute top-2 left-0 right-0 z-20 2xl:px-59 pointer-events-auto">
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
        </>
      ) : (
        children
      )}
    </div>
  );
}

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MessageTab>('all');

  // On mobile: if we're on a specific conversation, show the chat view full-screen
  const isInConversation = pathname !== '/messages';

  const handleTabChange = (tab: MessageTab) => {
    setActiveTab((prev) => (prev === tab ? 'all' : tab));
    // On mobile, tapping a tab while in a conversation navigates back to the list
    if (isInConversation) {
      router.push('/messages');
    }
  };

  return (
    <MessageShellProvider>
      <div className="h-[calc(100vh-60px)] flex overflow-hidden bg-[#faf6f0] dark:bg-[#0b0f1a]">
        {/* ══════════════════════════════════════════════
          LEFT — conversations list
          • Always visible on md+
          • On mobile: visible only on /messages, hidden when in a conversation
      ══════════════════════════════════════════════ */}
        <div
          className={cn(
            'flex flex-col border-r border-border bg-[#faf6f0] dark:bg-[#1c1f2e] shrink-0',
            // Width
            'w-full md:w-80',
            // Mobile visibility
            isInConversation ? 'hidden md:flex' : 'flex',
          )}
        >
          {/* Panel header */}
          <div className="flex items-center px-3 py-3 border-b border-border">
            <h1 className="shrink-0 px-1 pr-2 text-base font-bold text-stone-900 dark:text-stone-50 leading-tight">
              Messages
            </h1>
            <div className="min-w-0 flex-1">
              <MessagesTabNav
                activeTab={activeTab}
                onTabChange={handleTabChange}
              />
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
            'flex-1 flex flex-col overflow-hidden',
            // Mobile visibility — hide the empty-state on /messages so only the list shows
            !isInConversation && 'hidden md:flex',
          )}
        >
          {isInConversation ? (
            <ConversationShell>{children}</ConversationShell>
          ) : (
            children
          )}
        </div>
      </div>
    </MessageShellProvider>
  );
}
