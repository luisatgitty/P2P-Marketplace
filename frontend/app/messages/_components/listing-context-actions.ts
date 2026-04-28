import {
  openOrCreateConversationFromListing,
  type ScheduleRequestPayload,
} from '@/services/messagingService';

import type {
  ConversationListing,
  ListingContextActionState,
  ListingReviewPayload
} from '../_types/messages';
import {
  toggleConversationDealAgreement,
  updateConversationOfferAsOwner,
  updateConversationScheduleAsOwner,
  createListingReview,
  deleteListingReview,
  getMyListingReview,
  markListingAsComplete,
  updateListingReview
} from '../_services/listings';

export function getListingContextActionState(
  listing: ConversationListing,
  isSeller: boolean,
  hideActionButtons = false,
): ListingContextActionState {
  const normalizedStatus = String(listing.status ?? '')
    .trim()
    .toUpperCase();
  const normalizedTransactionStatus = String(listing.transactionStatus ?? '')
    .trim()
    .toUpperCase();
  const isSold = normalizedStatus === 'SOLD';
  const isListingBlocked =
    normalizedStatus === 'BANNED' || normalizedStatus === 'DELETED';
  const shouldHideButtons = hideActionButtons || isListingBlocked;
  const hasTransaction = normalizedTransactionStatus !== '';
  const isTransactionConfirmed = normalizedTransactionStatus === 'CONFIRMED';
  const canMarkAsComplete =
    isSeller &&
    isTransactionConfirmed &&
    (listing.listingType !== 'SELL' || !isSold);
  const canDeal =
    !isSold &&
    hasTransaction &&
    (normalizedTransactionStatus === 'PENDING' ||
      normalizedTransactionStatus === 'CONFIRMED');
  const hasAgreed = Boolean(listing.userAgreed);
  const canReview = !isSeller && Boolean(listing.canReview);
  const offeredPrice =
    Number(listing.offer ?? 0) > 0 ? Number(listing.offer) : listing.price;
  const scheduleValue = String(listing.schedule ?? '').trim();
  const canEditPrice =
    !shouldHideButtons && listing.listingType === 'SELL' && !isSold;
  const canEditSchedule =
    !shouldHideButtons &&
    (listing.listingType === 'RENT' || listing.listingType === 'SERVICE');

  return {
    normalizedStatus,
    normalizedTransactionStatus,
    isSold,
    isListingBlocked,
    shouldHideButtons,
    hasTransaction,
    isTransactionConfirmed,
    canMarkAsComplete,
    canDeal,
    hasAgreed,
    canReview,
    offeredPrice,
    scheduleValue,
    canEditPrice,
    canEditSchedule,
  };
}

export async function runMarkListingAsComplete(
  listingId: string,
): Promise<void> {
  await markListingAsComplete(listingId);
}

export async function runOfferUpdate(params: {
  listingId: string;
  conversationId?: string;
  isSeller: boolean;
  offerPrice: number;
  offerMessage?: string;
}): Promise<void> {
  if (params.isSeller && params.conversationId) {
    await updateConversationOfferAsOwner(
      params.conversationId,
      Math.trunc(params.offerPrice),
      params.offerMessage,
    );
    return;
  }

  await openOrCreateConversationFromListing(
    params.listingId,
    Math.trunc(params.offerPrice),
    params.offerMessage,
  );
}

export async function runDealToggle(conversationId: string): Promise<void> {
  await toggleConversationDealAgreement(conversationId);
}

export async function runScheduleUpdate(params: {
  listingId: string;
  conversationId?: string;
  isSeller: boolean;
  payload: ScheduleRequestPayload;
}): Promise<void> {
  if (params.isSeller && params.conversationId) {
    await updateConversationScheduleAsOwner(
      params.conversationId,
      params.payload,
    );
    return;
  }

  await openOrCreateConversationFromListing(
    params.listingId,
    undefined,
    undefined,
    {
      startDate: params.payload.startDate,
      endDate: params.payload.endDate,
      startTime: params.payload.startTime,
      endTime: params.payload.endTime,
      message: params.payload.message,
    },
  );
}

export async function loadListingReview(
  listingId: string,
): Promise<ListingReviewPayload | null> {
  return getMyListingReview(listingId);
}

export async function runReviewUpsert(params: {
  listingId: string;
  rating: number;
  comment: string;
  existingReview: ListingReviewPayload | null;
}): Promise<ListingReviewPayload> {
  if (params.existingReview) {
    return updateListingReview(params.listingId, params.rating, params.comment);
  }

  return createListingReview(params.listingId, params.rating, params.comment);
}

export async function runReviewDelete(listingId: string): Promise<void> {
  await deleteListingReview(listingId);
}
