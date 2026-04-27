import type { Conversation } from '@/types/messaging';
import type { ApiSuccess } from '@/types/api';

export type ScheduleRequestPayload = {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  message?: string;
};

export function emitMessagesUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('messages:updated'));
  }
}

export async function apiFetch<T>(route: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${route}`, {
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

export async function getConversations(): Promise<Conversation[]> {
  const data = await apiFetch<{ conversations: Conversation[] }>(
    '/messages/conversations',
    {
      method: 'GET',
    },
  );
  return data.conversations ?? [];
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
