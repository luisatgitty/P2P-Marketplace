import { type ListingTypeU } from '@/types/listings';

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export type AttachmentType = 'IMAGE' | 'VIDEO';

export type ReactionType = 'LIKE' | 'LOVE' | 'LAUGH' | 'WOW' | 'SAD' | 'ANGRY';

export type MessageTab = 'all' | 'buying' | 'selling' | 'rental' | 'services';

export type ConversationsPageQuery = {
  limit?: number;
  offset?: number;
  search?: string;
  tab?: MessageTab;
};

export type ConversationsPage = {
  conversations: Conversation[];
  total: number;
  limit: number;
  offset: number;
};

export interface ConversationParticipant {
  id: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string | null;
  status?: string;
  location?: string;
  city?: string;
  municipality?: string;
  cityMunicipality?: string;
  city_municipality?: string;
  province?: string;
  isOnline?: boolean;
  isActive?: boolean;
  isLocked?: boolean;
  accountLockedUntil?: string;
}

export interface ConversationListing {
  id: string;
  title: string;
  price: number;
  offer?: number;
  transactionStatus?: string;
  canReview?: boolean;
  providerAgreed?: boolean;
  clientAgreed?: boolean;
  userAgreed?: boolean;
  schedule?: string;
  scheduleStart?: string;
  scheduleEnd?: string;
  availableFrom?: string;
  daysOff?: string[];
  timeWindows?: { startTime: string; endTime: string }[];
  priceUnit?: string;
  listingType: ListingTypeU;
  imageUrl?: string | null;
  status: string;
}

export interface Conversation {
  id: string;
  listing: ConversationListing;
  otherParticipant: ConversationParticipant;
  lastMessage?: string;
  lastMessageAt?: string;
  otherLastReadMessageId?: string;
  unreadCount: number;
  isSeller: boolean;
  hasPendingReport?: boolean;
  canSendMessage?: boolean;
}

export interface MessageAttachment {
  id: string;
  fileUrl: string;
  fileType: AttachmentType;
  fileName?: string;
  fileSize?: number;
}

export interface MessageReaction {
  userId: string;
  type: ReactionType;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId?: string;
  content?: string;
  status: MessageStatus;
  attachments?: MessageAttachment[];
  /** Reactions — each user has at most one */
  reactions?: MessageReaction[];
  /** The message this one is replying to */
  replyTo?: ReplyPreview | null;
  /** True if the sender edited this message */
  isEdited?: boolean;
  /** True if the sender unsent this message */
  isUnsent?: boolean;
  createdAt: string;
}

/** Lightweight snapshot stored on the replying message */
export interface ReplyPreview {
  messageId: string;
  senderId: string;
  senderName: string;
  /** Text or label like "📷 Photo" / "🎥 Video" */
  contentPreview: string;
}

export interface ListingReviewPayload {
  id: string;
  rating: number;
  comment: string;
}

export type ListingContextActionState = {
  normalizedStatus: string;
  normalizedTransactionStatus: string;
  isSold: boolean;
  isListingBlocked: boolean;
  shouldHideButtons: boolean;
  hasTransaction: boolean;
  isTransactionConfirmed: boolean;
  canMarkAsComplete: boolean;
  canDeal: boolean;
  hasAgreed: boolean;
  canReview: boolean;
  offeredPrice: number;
  scheduleValue: string;
  canEditPrice: boolean;
  canEditSchedule: boolean;
};

export interface ChatHeaderProps {
  conversation: Conversation;
  onDelete?: () => void;
  onMarkedComplete?: () => void | Promise<void>;
  onOfferUpdated?: () => void | Promise<void>;
}

export interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
}

export interface ConversationsListProps {
  activeTab: MessageTab;
}

export type OutgoingAttachment = {
  name: string;
  mimeType: string;
  data: string;
};

export interface EmptyStateProps {
  tab: MessageTab;
  hasSearch?: boolean;
}

export interface ListingContextCardProps {
  conversationId?: string;
  listing: ConversationListing;
  isSeller?: boolean;
  hideActionButtons?: boolean;
  onMarkedComplete?: () => void | Promise<void>;
  onOfferUpdated?: () => void | Promise<void>;
}

export type UseListingContextActionsParams = {
  listing: ConversationListing;
  isSeller: boolean;
  hideActionButtons?: boolean;
  conversationId?: string;
  onMarkedComplete?: () => void | Promise<void>;
  onOfferUpdated?: () => void | Promise<void>;
};

export interface MessageInputProps {
  onSend: (content: string, attachments: OutgoingAttachment[]) => Promise<void>;
  disabled?: boolean;
  replyTo?: ReplyPreview | null;
  onCancelReply?: () => void;
  autoFocusKey?: string;
}

export type SendHandler = (
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

export interface MessageShellContextValue {
  shellState: MessageShellState;
  setShellState: React.Dispatch<React.SetStateAction<MessageShellState>>;
}

export interface MessagesTabNavProps {
  activeTab: MessageTab;
  onTabChange: (tab: MessageTab) => void;
}
