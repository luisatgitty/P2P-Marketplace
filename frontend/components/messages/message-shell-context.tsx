'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import type { Conversation, ReplyPreview } from '@/types/messaging';

type OutgoingAttachment = {
  name: string;
  mimeType: string;
  data: string;
};

type SendHandler = (
  content: string,
  attachments: OutgoingAttachment[],
) => Promise<void>;

type DeleteHandler = () => void | Promise<void>;
type MarkCompleteHandler = () => void | Promise<void>;
type OfferUpdatedHandler = () => void | Promise<void>;
type CancelReplyHandler = () => void;

export interface MessageShellState {
  conversation: Conversation | null;
  onDelete?: DeleteHandler;
  onMarkedComplete?: MarkCompleteHandler;
  onOfferUpdated?: OfferUpdatedHandler;
  onSend: SendHandler;
  inputDisabled: boolean;
  replyTo: ReplyPreview | null;
  onCancelReply?: CancelReplyHandler;
}

interface MessageShellContextValue {
  shellState: MessageShellState;
  setShellState: React.Dispatch<React.SetStateAction<MessageShellState>>;
}

const noopSend: SendHandler = async () => {};

const INITIAL_STATE: MessageShellState = {
  conversation: null,
  onSend: noopSend,
  inputDisabled: true,
  replyTo: null,
};

const MessageShellContext = createContext<MessageShellContextValue | null>(
  null,
);

export function MessageShellProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [shellState, setShellState] =
    useState<MessageShellState>(INITIAL_STATE);

  const value = useMemo(() => ({ shellState, setShellState }), [shellState]);

  return (
    <MessageShellContext.Provider value={value}>
      {children}
    </MessageShellContext.Provider>
  );
}

export function useMessageShell() {
  const context = useContext(MessageShellContext);
  if (!context) {
    throw new Error(
      'useMessageShell must be used within MessageShellProvider.',
    );
  }
  return context;
}
