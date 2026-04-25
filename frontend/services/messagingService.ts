import type {
  Conversation,
  Message,
  MessageTab,
  ReactionType,
  ReplyPreview,
} from '@/types/messaging';

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

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

export type ScheduleRequestPayload = {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  message?: string;
};

export type MessagesPageQuery = {
  limit?: number;
  offset?: number;
};

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

export type MessagesPage = {
  messages: Message[];
  total: number;
  limit: number;
  offset: number;
};

function emitMessagesUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('messages:updated'));
  }
}

async function apiFetch<T>(route: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${route}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const parsed = (await res.json()) as Partial<ApiSuccess<T>> & {
    data?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(
      parsed?.data?.message ??
        'An unexpected error occurred. Please try again later.',
    );
  }

  return (parsed.data ?? {}) as T;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getConversations(): Promise<Conversation[]> {
  const data = await apiFetch<{ conversations: Conversation[] }>(
    '/messages/conversations',
    {
      method: 'GET',
    },
  );
  return data.conversations ?? [];
}

export async function getConversationsPage(
  query: ConversationsPageQuery = {},
): Promise<ConversationsPage> {
  const params = new URLSearchParams();
  if (Number.isFinite(query.limit)) {
    params.set('limit', String(query.limit));
  }
  if (Number.isFinite(query.offset)) {
    params.set('offset', String(query.offset));
  }
  if (typeof query.search === 'string' && query.search.trim() !== '') {
    params.set('search', query.search.trim());
  }
  if (typeof query.tab === 'string' && query.tab.trim() !== '') {
    params.set('tab', query.tab.trim());
  }

  const suffix = params.size > 0 ? `?${params.toString()}` : '';

  try {
    const data = await apiFetch<{
      conversations: Conversation[];
      total?: number;
      limit?: number;
      offset?: number;
    }>(`/messages/conversations${suffix}`, {
      method: 'GET',
    });

    const conversations = data.conversations ?? [];
    const total = Number(data.total ?? conversations.length);
    const limit = Number(data.limit ?? query.limit ?? conversations.length);
    const offset = Number(data.offset ?? query.offset ?? 0);

    return {
      conversations,
      total,
      limit,
      offset,
    };
  } catch {
    return {
      conversations: [],
      total: 0,
      limit: Number(query.limit ?? 0),
      offset: Number(query.offset ?? 0),
    };
  }
}

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

export async function openOrCreateConversationFromListing(
  listingId: string,
  offerPrice?: number,
  offerMessage?: string,
  schedule?: ScheduleRequestPayload,
): Promise<string> {
  const data = await apiFetch<{ conversationId: string }>(
    '/messages/conversations/from-listing',
    {
      method: 'POST',
      body: JSON.stringify({
        listingId,
        offerPrice:
          Number.isFinite(offerPrice) && (offerPrice ?? 0) > 0
            ? Math.trunc(offerPrice as number)
            : undefined,
        offerMessage: (offerMessage ?? '').trim() || undefined,
        startDate: schedule?.startDate,
        endDate: schedule?.endDate,
        startTime: schedule?.startTime,
        endTime: schedule?.endTime,
        scheduleMessage: (schedule?.message ?? '').trim() || undefined,
      }),
    },
  );
  emitMessagesUpdate();
  return data.conversationId;
}

export async function updateConversationOfferAsOwner(
  conversationId: string,
  offerPrice?: number,
  offerMessage?: string,
): Promise<void> {
  await apiFetch<{}>(`/messages/conversations/${conversationId}/offer`, {
    method: 'PATCH',
    body: JSON.stringify({
      offerPrice:
        Number.isFinite(offerPrice) && (offerPrice ?? 0) > 0
          ? Math.trunc(offerPrice as number)
          : undefined,
      offerMessage: (offerMessage ?? '').trim() || undefined,
    }),
  });
  emitMessagesUpdate();
}

export async function updateConversationScheduleAsOwner(
  conversationId: string,
  schedule: ScheduleRequestPayload,
): Promise<void> {
  await apiFetch<{}>(`/messages/conversations/${conversationId}/schedule`, {
    method: 'PATCH',
    body: JSON.stringify({
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      scheduleMessage: (schedule.message ?? '').trim() || undefined,
    }),
  });
  emitMessagesUpdate();
}

export async function toggleConversationDealAgreement(
  conversationId: string,
): Promise<void> {
  await apiFetch<{}>(`/messages/conversations/${conversationId}/deal`, {
    method: 'PATCH',
  });
  emitMessagesUpdate();
}
