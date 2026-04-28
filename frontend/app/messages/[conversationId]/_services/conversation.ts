import {
  apiFetch,
  emitMessagesUpdate
} from '@/services/messagingService';

import type {
  Conversation,
  Message,
  ReactionType,
  ReplyPreview
} from '../../_types/messages';
import type {
  MessagesPageQuery,
  MessagesPage,
  OutgoingMessageAttachment
} from '../_types/conversation';

export async function getConversation(
  id: string,
): Promise<Conversation | null> {
  try {
    const data = await apiFetch<{ conversation: Conversation }>(
      `/messages/conversations/${id}`,
      {
        method: 'GET',
      },
    );
    return data.conversation ?? null;
  } catch {
    return null;
  }
}

export async function getConversations(): Promise<Conversation[]> {
  const data = await apiFetch<{ conversations: Conversation[] }>(
    '/messages/conversations',
    {
      method: 'GET',
    },
  );
  return data.conversations ?? [];
}

export async function getMessages(
  conversationId: string,
  query: MessagesPageQuery = {},
): Promise<MessagesPage> {
  const params = new URLSearchParams();
  if (Number.isFinite(query.limit)) {
    params.set('limit', String(query.limit));
  }
  if (Number.isFinite(query.offset)) {
    params.set('offset', String(query.offset));
  }

  const suffix = params.size > 0 ? `?${params.toString()}` : '';

  try {
    const data = await apiFetch<{
      messages: Message[];
      total?: number;
      limit?: number;
      offset?: number;
    }>(`/messages/conversations/${conversationId}/messages${suffix}`, {
      method: 'GET',
    });

    const messages = data.messages ?? [];
    const total = Number(data.total ?? messages.length);
    const limit = Number(data.limit ?? query.limit ?? messages.length);
    const offset = Number(data.offset ?? query.offset ?? 0);

    return {
      messages,
      total,
      limit,
      offset,
    };
  } catch {
    return {
      messages: [],
      total: 0,
      limit: Number(query.limit ?? 0),
      offset: Number(query.offset ?? 0),
    };
  }
}

export async function sendMessage(
  conversationId: string,
  content: string,
  attachments: OutgoingMessageAttachment[],
  replyTo?: ReplyPreview | null,
): Promise<Message> {
  const data = await apiFetch<{ message: Message }>(
    `/messages/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({
        content,
        attachments,
        replyTo: replyTo?.messageId ? { messageId: replyTo.messageId } : null,
      }),
    },
  );
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
  await apiFetch<{}>(
    `/messages/conversations/${conversationId}/messages/${messageId}/reaction`,
    {
      method: 'PATCH',
      body: JSON.stringify({ reaction }),
    },
  );
}

export async function editMessage(
  conversationId: string,
  messageId: string,
  newContent: string,
): Promise<void> {
  await apiFetch<{}>(
    `/messages/conversations/${conversationId}/messages/${messageId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ content: newContent }),
    },
  );
  emitMessagesUpdate();
}

export async function deleteMessage(
  conversationId: string,
  messageId: string,
  unsend: boolean,
): Promise<void> {
  await apiFetch<{}>(
    `/messages/conversations/${conversationId}/messages/${messageId}?unsend=${unsend ? 'true' : 'false'}`,
    {
      method: 'DELETE',
    },
  );
  emitMessagesUpdate();
}

export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  await apiFetch<{}>(`/messages/conversations/${conversationId}/read`, {
    method: 'PATCH',
  });
  emitMessagesUpdate();
}

export async function deleteConversation(
  conversationId: string,
): Promise<void> {
  await apiFetch<{}>(`/messages/conversations/${conversationId}`, {
    method: 'DELETE',
  });
  emitMessagesUpdate();
}
