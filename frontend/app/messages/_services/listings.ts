import {
  apiFetch,
  emitMessagesUpdate,
  ScheduleRequestPayload
} from '@/services/messagingService';

import type {
  Conversation,
  ConversationsPageQuery,
  ConversationsPage,
  ListingReviewPayload
} from '../_types/messages';

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





export async function markListingAsComplete(id: string): Promise<void> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/listing/${id}/mark-complete`,
      {
        method: 'PATCH',
        credentials: 'include',
      },
    );

    if (!res.ok) {
      const parsedJson = await res.json();
      throw (
        parsedJson?.data?.message || 'Failed to complete listing transaction.'
      );
    }
  } catch (err) {
    if (typeof err === 'string') throw err;
    if (err instanceof Error) throw err.message;
    throw 'An unexpected error occurred. Please try again later.';
  }
}

export async function getMyListingReview(
  id: string,
): Promise<ListingReviewPayload | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/listing/${id}/review`,
      {
        method: 'GET',
        credentials: 'include',
      },
    );

    if (res.status === 404) {
      return null;
    }

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to fetch review.';
    }

    return parsedJson.data as ListingReviewPayload;
  } catch (err) {
    if (typeof err === 'string') throw err;
    if (err instanceof Error) throw err.message;
    throw 'An unexpected error occurred. Please try again later.';
  }
}

export async function createListingReview(
  id: string,
  rating: number,
  comment: string,
): Promise<ListingReviewPayload> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/listing/${id}/review`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating, comment }),
      },
    );

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to submit review.';
    }

    return parsedJson.data as ListingReviewPayload;
  } catch (err) {
    if (typeof err === 'string') throw err;
    if (err instanceof Error) throw err.message;
    throw 'An unexpected error occurred. Please try again later.';
  }
}

export async function updateListingReview(
  id: string,
  rating: number,
  comment: string,
): Promise<ListingReviewPayload> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/listing/${id}/review`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating, comment }),
      },
    );

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to update review.';
    }

    return parsedJson.data as ListingReviewPayload;
  } catch (err) {
    if (typeof err === 'string') throw err;
    if (err instanceof Error) throw err.message;
    throw 'An unexpected error occurred. Please try again later.';
  }
}

export async function deleteListingReview(id: string): Promise<void> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/listing/${id}/review`,
      {
        method: 'DELETE',
        credentials: 'include',
      },
    );

    if (!res.ok) {
      const parsedJson = await res.json();
      throw parsedJson?.data?.message || 'Failed to delete review.';
    }
  } catch (err) {
    if (typeof err === 'string') throw err;
    if (err instanceof Error) throw err.message;
    throw 'An unexpected error occurred. Please try again later.';
  }
}

export async function submitUserListingReport(
  id: string,
  reportedUserId: string,
  reason: string,
  description: string,
): Promise<void> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/listing/${id}/report`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportedUserId,
          reason,
          description,
        }),
      },
    );

    if (!res.ok) {
      const parsedJson = await res.json();
      throw parsedJson?.data?.message || 'Failed to submit report.';
    }
  } catch (err) {
    if (typeof err === 'string') throw err;
    if (err instanceof Error) throw err.message;
    throw 'An unexpected error occurred. Please try again later.';
  }
}
