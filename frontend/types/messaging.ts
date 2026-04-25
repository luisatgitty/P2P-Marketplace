export type ListingType = 'SELL' | 'RENT' | 'SERVICE';

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export type AttachmentType = 'IMAGE' | 'VIDEO';

export type ReactionType = 'LIKE' | 'LOVE' | 'LAUGH' | 'WOW' | 'SAD' | 'ANGRY';

export type MessageTab = 'all' | 'buying' | 'selling' | 'rental' | 'services';

export const REACTIONS: { type: ReactionType; emoji: string; label: string }[] =
  [
    { type: 'LIKE', emoji: '👍', label: 'Like' },
    { type: 'LOVE', emoji: '❤️', label: 'Love' },
    { type: 'LAUGH', emoji: '😂', label: 'Haha' },
    { type: 'WOW', emoji: '😮', label: 'Wow' },
    { type: 'SAD', emoji: '😢', label: 'Sad' },
    { type: 'ANGRY', emoji: '😡', label: 'Angry' },
  ];

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
  listingType: ListingType;
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

/** A reaction left by one user on a message */
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
