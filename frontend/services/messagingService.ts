import type {
  Conversation,
  Message,
  ReactionType,
  ReplyPreview,
} from "@/types/messaging";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type ApiSuccess<T> = {
  retCode: string;
  message: string;
  data: T;
};

export type OutgoingMessageAttachment = {
  name: string;
  mimeType: string;
  data: string;
};

function emitMessagesUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("messages:updated"));
  }
}

async function apiFetch<T>(route: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${route}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const parsed = (await res.json()) as Partial<ApiSuccess<T>> & {
    data?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(parsed?.data?.message ?? "An unexpected error occurred. Please try again later.");
  }

  return (parsed.data ?? {}) as T;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getConversations(): Promise<Conversation[]> {
  const data = await apiFetch<{ conversations: Conversation[] }>("/messages/conversations", {
    method: "GET",
  });
  return data.conversations ?? [];
}

export async function getConversation(id: string): Promise<Conversation | null> {
  try {
    const data = await apiFetch<{ conversation: Conversation }>(`/messages/conversations/${id}`, {
      method: "GET",
    });
    return data.conversation ?? null;
  } catch {
    return null;
  }
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  try {
    const data = await apiFetch<{ messages: Message[] }>(`/messages/conversations/${conversationId}/messages`, {
      method: "GET",
    });
    return data.messages ?? [];
  } catch {
    return [];
  }
}

export async function sendMessage(
  conversationId: string,
  content: string,
  attachments: OutgoingMessageAttachment[],
  replyTo?: ReplyPreview | null,
): Promise<Message> {
  const data = await apiFetch<{ message: Message }>(`/messages/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content,
      attachments,
      replyTo: replyTo?.messageId ? { messageId: replyTo.messageId } : null,
    }),
  });
  emitMessagesUpdate();
  return {
    ...data.message,
    replyTo: replyTo ?? data.message.replyTo,
  };
}

export async function reactToMessage(
  conversationId: string,
  messageId: string,
  _userId: string,
  reaction: ReactionType | null,
): Promise<void> {
  await apiFetch<{}>(`/messages/conversations/${conversationId}/messages/${messageId}/reaction`, {
    method: "PATCH",
    body: JSON.stringify({ reaction }),
  });
}

export async function editMessage(
  conversationId: string,
  messageId: string,
  newContent: string,
): Promise<void> {
  await apiFetch<{}>(`/messages/conversations/${conversationId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ content: newContent }),
  });
  emitMessagesUpdate();
}

export async function deleteMessage(
  conversationId: string,
  messageId: string,
  unsend: boolean,
): Promise<void> {
  await apiFetch<{}>(`/messages/conversations/${conversationId}/messages/${messageId}?unsend=${unsend ? "true" : "false"}`, {
    method: "DELETE",
  });
  emitMessagesUpdate();
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await apiFetch<{}>(`/messages/conversations/${conversationId}/read`, {
    method: "PATCH",
  });
  emitMessagesUpdate();
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await apiFetch<{}>(`/messages/conversations/${conversationId}`, {
    method: "DELETE",
  });
  emitMessagesUpdate();
}

export async function openOrCreateConversationFromListing(listingId: string, offerPrice?: number, offerMessage?: string): Promise<string> {
  const data = await apiFetch<{ conversationId: string }>("/messages/conversations/from-listing", {
    method: "POST",
    body: JSON.stringify({
      listingId,
      offerPrice: Number.isFinite(offerPrice) && (offerPrice ?? 0) > 0 ? Math.trunc(offerPrice as number) : undefined,
      offerMessage: (offerMessage ?? "").trim() || undefined,
    }),
  });
  emitMessagesUpdate();
  return data.conversationId;
}

export async function toggleConversationDealAgreement(conversationId: string): Promise<void> {
  await apiFetch<{}>(`/messages/conversations/${conversationId}/deal`, {
    method: "PATCH",
  });
  emitMessagesUpdate();
}
