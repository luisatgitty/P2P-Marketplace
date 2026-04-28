'use client';

import { useContext, useMemo, useState } from 'react';

import { INITIAL_STATE, MessageShellContext } from '../_constants/messages';
import type { MessageShellState } from '../_types/messages';

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
