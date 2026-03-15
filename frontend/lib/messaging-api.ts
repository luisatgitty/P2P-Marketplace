import type { Conversation, Message } from "@/types/messaging";
import {
  getConversations as getConversationsFromService,
  getMessages as getMessagesFromService,
  sendMessage as sendMessageFromService,
  openOrCreateConversationFromListing,
  markConversationRead,
} from "@/services/messagingService";

export type ConversationAPI = Conversation;
export type MessageAPI = Message;

export const getConversations = async (): Promise<ConversationAPI[]> => {
  return getConversationsFromService();
};

export const getMessages = async (conversationId: string): Promise<MessageAPI[]> => {
  return getMessagesFromService(conversationId);
};

export const sendMessage = async (conversationId: string, content: string): Promise<MessageAPI> => {
  return sendMessageFromService(conversationId, content, "me", null);
};

export const createConversation = async (listingId: string): Promise<{ id: string }> => {
  const conversationId = await openOrCreateConversationFromListing(listingId);
  return { id: conversationId };
};

export const markAsRead = async (conversationId: string): Promise<void> => {
  await markConversationRead(conversationId);
};
