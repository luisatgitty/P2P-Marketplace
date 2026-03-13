// ─── Enums (mirror the DB enums) ─────────────────────────────────────────────

export type ListingType   = "SELL" | "RENT" | "SERVICE";
export type MessageStatus = "SENT" | "DELIVERED" | "READ";
export type AttachmentType = "IMAGE" | "VIDEO";

/** The five tabs shown in the messages section */
export type MessageTab = "all" | "buying" | "selling" | "rental" | "services";

// ─── Entities ─────────────────────────────────────────────────────────────────

export interface ConversationParticipant {
  id: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string | null;
  isOnline?: boolean;
}

export interface ConversationListing {
  id: string;
  title: string;
  price: number;
  priceUnit?: string;      // e.g. "/ day" for rentals
  listingType: ListingType;
  imageUrl?: string | null;
  status: string;          // mirrors listing_status enum
}

export interface Conversation {
  id: string;
  listing: ConversationListing;
  /** The other party in the conversation (not the logged-in user) */
  otherParticipant: ConversationParticipant;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  /** true  → current user is the seller/provider in this conversation
   *  false → current user is the buyer */
  isSeller: boolean;
}

export interface MessageAttachment {
  id: string;
  fileUrl: string;
  fileType: AttachmentType;
  fileName?: string;
  fileSize?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content?: string;
  status: MessageStatus;
  attachments?: MessageAttachment[];
  createdAt: string;
}
