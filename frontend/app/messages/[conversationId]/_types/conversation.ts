import type {
  Message,
  ReactionType
} from '../../_types/messages';

export type OutgoingMessageAttachment = {
  name: string;
  mimeType: string;
  data: string;
};

export type MessagesPageQuery = {
  limit?: number;
  offset?: number;
};

export type MessagesPage = {
  messages: Message[];
  total: number;
  limit: number;
  offset: number;
};

export interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
  showTime?: boolean;
  /** Name of the other participant (for reply labels) */
  otherName: string;
  onReply: (msg: Message) => void;
  onReact: (messageId: string, reaction: ReactionType | null) => void;
  onEdit: (messageId: string, currentContent: string) => void;
  onDelete: (messageId: string, unsend: boolean) => void;
  onOpenMediaViewer?: (attachmentId: string) => void;
}
