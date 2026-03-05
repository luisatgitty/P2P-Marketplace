// API client for messaging - ready for backend integration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface MessageAPI {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
}

export interface ConversationAPI {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar?: string;
  listing_id?: string;
  listing_title?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

// Get all conversations for current user
export const getConversations = async (
  token: string
): Promise<ConversationAPI[]> => {
  const response = await fetch(`${API_BASE_URL}/messages/conversations`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch conversations");
  }

  return response.json();
};

// Get messages for a specific conversation
export const getMessages = async (
  conversationId: string,
  token: string
): Promise<MessageAPI[]> => {
  const response = await fetch(
    `${API_BASE_URL}/messages/conversations/${conversationId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch messages");
  }

  return response.json();
};

// Send a message
export const sendMessage = async (
  conversationId: string,
  content: string,
  token: string
): Promise<MessageAPI> => {
  const response = await fetch(`${API_BASE_URL}/messages/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      conversation_id: conversationId,
      content,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to send message");
  }

  return response.json();
};

// Create a new conversation (when messaging from a listing)
export const createConversation = async (
  listingId: string,
  recipientId: string,
  token: string
): Promise<ConversationAPI> => {
  const response = await fetch(
    `${API_BASE_URL}/messages/conversations/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        listing_id: listingId,
        recipient_id: recipientId,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to create conversation");
  }

  return response.json();
};

// Mark conversation as read
export const markAsRead = async (
  conversationId: string,
  token: string
): Promise<void> => {
  const response = await fetch(
    `${API_BASE_URL}/messages/conversations/${conversationId}/read`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to mark conversation as read");
  }
};
