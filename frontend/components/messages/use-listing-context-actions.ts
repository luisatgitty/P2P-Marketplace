'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/utils/ConfirmDialogContext';
import type { ConversationListing } from '@/types/messaging';
import type { ScheduleRequestPayload } from '@/services/messagingService';
import type { ListingReviewPayload } from '@/services/listingDetailService';
import {
  getListingContextActionState,
  loadListingReview,
  runDealToggle,
  runMarkListingAsComplete,
  runOfferUpdate,
  runReviewDelete,
  runReviewUpsert,
  runScheduleUpdate,
} from './listing-context-actions';

type UseListingContextActionsParams = {
  listing: ConversationListing;
  isSeller: boolean;
  hideActionButtons?: boolean;
  conversationId?: string;
  onMarkedComplete?: () => void | Promise<void>;
  onOfferUpdated?: () => void | Promise<void>;
};

export function useListingContextActions({
  listing,
  isSeller,
  hideActionButtons = false,
  conversationId,
  onMarkedComplete,
  onOfferUpdated,
}: UseListingContextActionsParams) {
  const { openDialog } = useConfirmDialog();
  const actionState = getListingContextActionState(listing, isSeller, hideActionButtons);
  const [editPriceOpen, setEditPriceOpen] = useState(false);
  const [editScheduleOpen, setEditScheduleOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [priceSubmitting, setPriceSubmitting] = useState(false);
  const [dealSubmitting, setDealSubmitting] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDeleting, setReviewDeleting] = useState(false);
  const [existingReview, setExistingReview] = useState<ListingReviewPayload | null>(null);
  const [newPrice, setNewPrice] = useState(actionState.offeredPrice);

  useEffect(() => {
    setNewPrice(actionState.offeredPrice);
  }, [actionState.offeredPrice]);

  useEffect(() => {
    let mounted = true;

    const loadExistingReview = async () => {
      if (!actionState.canReview) {
        if (mounted) setExistingReview(null);
        return;
      }

      setReviewLoading(true);
      try {
        const payload = await loadListingReview(listing.id);
        if (!mounted) return;
        setExistingReview(payload);
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : String(err || 'Failed to load review.');
        toast.error(message, { position: 'top-center' });
      } finally {
        if (mounted) setReviewLoading(false);
      }
    };

    void loadExistingReview();

    return () => {
      mounted = false;
    };
  }, [actionState.canReview, listing.id]);

  const resetReviewForm = () => {
    setRating(0);
    setComment('');
  };

  const handleCloseReviewModal = () => {
    if (reviewSubmitting || reviewDeleting) return;
    setReviewOpen(false);
    resetReviewForm();
  };

  const handleOpenReviewModal = () => {
    if (reviewLoading) return;

    setRating(existingReview?.rating ?? 0);
    setComment(existingReview?.comment ?? '');
    setReviewOpen(true);
  };

  const handleReviewAction = async () => {
    if (reviewSubmitting || reviewDeleting) return;

    if (rating <= 0) {
      handleCloseReviewModal();
      return;
    }

    const trimmedComment = comment.trim();
    const isEditing = Boolean(existingReview);

    if (
      isEditing
      && existingReview
      && existingReview.rating === rating
      && existingReview.comment.trim() === trimmedComment
    ) {
      toast.info('No changes to update.', { position: 'top-center' });
      handleCloseReviewModal();
      return;
    }

    setReviewSubmitting(true);
    try {
      const savedReview = await runReviewUpsert({
        listingId: listing.id,
        rating,
        comment: trimmedComment,
        existingReview,
      });
      setExistingReview(savedReview);
      toast.success(isEditing ? 'Review updated successfully.' : 'Review submitted. Thank you for your feedback.', { position: 'top-center' });
      handleCloseReviewModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err || 'Failed to submit review.');
      toast.error(message, { position: 'top-center' });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDeleteReview = () => {
    if (!existingReview || reviewSubmitting || reviewDeleting) return;

    openDialog({
      title: 'Delete Review',
      message: 'Delete your review for this item?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDangerous: true,
      onConfirm: async () => {
        setReviewDeleting(true);
        try {
          await runReviewDelete(listing.id);
          setExistingReview(null);
          toast.success('Review deleted successfully.', { position: 'top-center' });
          handleCloseReviewModal();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err || 'Failed to delete review.');
          toast.error(message, { position: 'top-center' });
        } finally {
          setReviewDeleting(false);
        }
      },
      onCancel: () => {},
    });
  };

  const handleConfirmMarkComplete = async () => {
    if (!actionState.canMarkAsComplete || markingComplete) return;

    setMarkingComplete(true);
    try {
      await runMarkListingAsComplete(listing.id);
      toast.success(listing.listingType === 'SELL' ? 'Listing marked as sold.' : 'Listing marked as complete.', { position: 'top-center' });
      await onMarkedComplete?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err || 'Failed to complete listing transaction.');
      toast.error(message, { position: 'top-center' });
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleOpenMarkCompleteDialog = () => {
    if (!actionState.canMarkAsComplete) return;

    openDialog({
      title: listing.listingType === 'SELL' ? 'Mark item as sold' : 'Mark transaction as fulfilled',
      message: listing.listingType === 'SELL'
        ? 'Please confirm that this For Sale item has already been sold. This action will mark the listing as sold, and buyer will be able to provide review.'
        : 'Please confirm that this transaction is fulfilled. This will mark the transaction as completed, and client will be able to provide review.',
      confirmText: 'Confirm',
      isDangerous: false,
      onConfirm: () => void handleConfirmMarkComplete(),
      onCancel: () => {},
    });
  };

  const handleEditPriceAction = async () => {
    if (priceSubmitting) return;
    if (newPrice <= 0) {
      toast.error('Please enter a valid price.', { position: 'top-center' });
      return;
    }

    if (Math.trunc(newPrice) === Math.trunc(actionState.offeredPrice) && !actionState.hasTransaction) {
      return;
    }

    setPriceSubmitting(true);
    try {
      await runOfferUpdate({
        listingId: listing.id,
        conversationId,
        isSeller,
        offerPrice: newPrice,
        offerMessage,
      });
      await onOfferUpdated?.();
      toast.success('Offer updated successfully.', { position: 'top-center' });
      setEditPriceOpen(false);
      setOfferMessage('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update offer.';
      toast.error(message, { position: 'top-center' });
    } finally {
      setPriceSubmitting(false);
    }
  };

  const handleCloseEditPriceModal = () => {
    setEditPriceOpen(false);
    setNewPrice(actionState.offeredPrice);
    setOfferMessage('');
  };

  const handleDealAction = async () => {
    if (dealSubmitting) return;
    if (!conversationId || !actionState.canDeal) return;

    setDealSubmitting(true);
    try {
      await runDealToggle(conversationId);
      await onOfferUpdated?.();
      toast.success('Deal agreement updated.', { position: 'top-center' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update agreement.';
      toast.error(message, { position: 'top-center' });
    } finally {
      setDealSubmitting(false);
    }
  };

  const handleEditScheduleAction = async (payload: ScheduleRequestPayload) => {
    try {
      await runScheduleUpdate({
        listingId: listing.id,
        conversationId,
        isSeller,
        payload,
      });
      await onOfferUpdated?.();
      setEditScheduleOpen(false);
      toast.success('Schedule request sent.', { position: 'top-center' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request schedule.';
      toast.error(message, { position: 'top-center' });
      throw err;
    }
  };

  return {
    actionState,
    state: {
      editPriceOpen,
      editScheduleOpen,
      reviewOpen,
      rating,
      comment,
      offerMessage,
      reviewLoading,
      markingComplete,
      priceSubmitting,
      dealSubmitting,
      reviewSubmitting,
      reviewDeleting,
      existingReview,
      newPrice,
    },
    setters: {
      setEditPriceOpen,
      setEditScheduleOpen,
      setReviewOpen,
      setRating,
      setComment,
      setOfferMessage,
      setNewPrice,
    },
    actions: {
      handleCloseReviewModal,
      handleOpenReviewModal,
      handleReviewAction,
      handleDeleteReview,
      handleOpenMarkCompleteDialog,
      handleEditPriceAction,
      handleCloseEditPriceModal,
      handleDealAction,
      handleEditScheduleAction,
    },
  };
}