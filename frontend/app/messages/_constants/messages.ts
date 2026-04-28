import {
  Key,
  MessageSquare,
  ShoppingCart,
  Tag,
  Wrench,
} from 'lucide-react';
import { createContext } from 'react';

import type {
  ReactionType,
  MessageTab,
  SendHandler,
  MessageShellState,
  MessageShellContextValue
} from '../_types/messages';

export const REACTIONS: { type: ReactionType; emoji: string; label: string }[] =
  [
    { type: 'LIKE', emoji: '👍', label: 'Like' },
    { type: 'LOVE', emoji: '❤️', label: 'Love' },
    { type: 'LAUGH', emoji: '😂', label: 'Haha' },
    { type: 'WOW', emoji: '😮', label: 'Wow' },
    { type: 'SAD', emoji: '😢', label: 'Sad' },
    { type: 'ANGRY', emoji: '😡', label: 'Angry' },
  ];

export const TAB_META: Record<
  MessageTab,
  { icon: React.ElementType; title: string; body: string }
> = {
  all: {
    icon: MessageSquare,
    title: 'No conversations yet',
    body: 'Start messaging sellers, renters, and service providers to get started.',
  },
  buying: {
    icon: ShoppingCart,
    title: 'No buying conversations',
    body: 'Browse listings and message a seller to start buying.',
  },
  selling: {
    icon: Tag,
    title: 'No selling conversations',
    body: "You haven't received any messages on your listings yet.",
  },
  rental: {
    icon: Key,
    title: 'No rental conversations',
    body: 'Browse rental listings and reach out to a lender.',
  },
  services: {
    icon: Wrench,
    title: 'No service conversations',
    body: 'Find a service provider and get in touch.',
  },
};

const noopSend: SendHandler = async () => {};

export const INITIAL_STATE: MessageShellState = {
  conversation: null,
  onSend: noopSend,
  inputDisabled: true,
  replyTo: null,
};

export const MessageShellContext = createContext<MessageShellContextValue | null>(
  null,
);

export const MESSAGE_TABS: {
  id: MessageTab;
  label: string;
  Icon: React.ElementType;
}[] = [
  { id: 'buying', label: 'Buy', Icon: ShoppingCart },
  { id: 'selling', label: 'Sell', Icon: Tag },
  { id: 'rental', label: 'Rent', Icon: Key },
  { id: 'services', label: 'Service', Icon: Wrench },
];
