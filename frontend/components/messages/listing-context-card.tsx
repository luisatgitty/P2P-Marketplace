


"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ConversationListing } from "@/types/messaging";
import {
  createListingReview,
  deleteListingReview,
  getMyListingReview,
  markListingAsComplete,
  updateListingReview,
  type ListingReviewPayload,
} from "@/services/listingDetailService";
import {
  openOrCreateConversationFromListing,
  toggleConversationDealAgreement,
  updateConversationOfferAsOwner,
} from "@/services/messagingService";
import { ConfirmActionModal } from "@/components/confirm-action-modal"; 
import OfferModal from "@/components/offer-modal";
import { ScheduleModal } from "@/components/schedule-modal";
import { Separator } from "@/components/ui/separator";
import { ImageLink } from "../image-link";

interface ListingContextCardProps {
  conversationId?: string;
  listing: ConversationListing;
  isSeller?: boolean;
  hideActionButtons?: boolean;
  onMarkedComplete?: () => void | Promise<void>;
  onOfferUpdated?: () => void | Promise<void>;
}

export default function ListingContextCard({
  conversationId,
  listing,
  isSeller = false,
  hideActionButtons = false,
  onMarkedComplete,
  onOfferUpdated,
}: ListingContextCardProps) {
  const fmt = (n: number) =>
    "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 0 });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [editPriceOpen, setEditPriceOpen] = useState(false);
  const [editScheduleOpen, setEditScheduleOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [priceSubmitting, setPriceSubmitting] = useState(false);
  const [dealSubmitting, setDealSubmitting] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDeleting, setReviewDeleting] = useState(false);
  const [existingReview, setExistingReview] = useState<ListingReviewPayload | null>(null);

  const normalizedStatus = String(listing.status ?? "").trim().toUpperCase();
  const normalizedTransactionStatus = String(listing.transactionStatus ?? "").trim().toUpperCase();
  const isSold = normalizedStatus === "SOLD";
  const isListingBlocked = normalizedStatus === "BANNED" || normalizedStatus === "DELETED";
  const shouldHideButtons = hideActionButtons || isListingBlocked;
  const hasTransaction = normalizedTransactionStatus !== "";
  const isTransactionConfirmed = normalizedTransactionStatus === "CONFIRMED";
  const canMarkAsComplete = isSeller && isTransactionConfirmed && (listing.listingType !== "SELL" || !isSold);
  const canDeal = !isSold && hasTransaction && (normalizedTransactionStatus === "PENDING" || normalizedTransactionStatus === "CONFIRMED");
  const hasAgreed = Boolean(listing.userAgreed);
  const canReview = !isSeller && Boolean(listing.canReview);
  const offeredPrice = Number(listing.offer ?? 0) > 0 ? Number(listing.offer) : listing.price;
  const scheduleValue = String(listing.schedule ?? "").trim();
  const [ newPrice, setNewPrice ] = useState(offeredPrice);
  const isOfferChanged = Math.trunc(newPrice) !== Math.trunc(offeredPrice) || !hasTransaction;

  useEffect(() => {
    let mounted = true;

    const loadExistingReview = async () => {
      if (!canReview) {
        if (mounted) setExistingReview(null);
        return;
      }

      setReviewLoading(true);
      try {
        const payload = await getMyListingReview(listing.id);
        if (!mounted) return;
        setExistingReview(payload);
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : String(err || "Failed to load review.");
        toast.error(message, { position: "top-center" });
      } finally {
        if (mounted) setReviewLoading(false);
      }
    };

    loadExistingReview();

    return () => {
      mounted = false;
    };
  }, [canReview, listing.id]);

  const resetReviewForm = () => {
    setRating(0);
    setComment("");
  };

  const handleCloseReviewModal = () => {
    if (reviewSubmitting || reviewDeleting) return;
    setReviewOpen(false);
    resetReviewForm();
  };

  const handleOpenReviewModal = () => {
    if (reviewLoading) return;

    setRating(existingReview?.rating ?? 0);
    setComment(existingReview?.comment ?? "");
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
      toast.info("No changes to update.", { position: "top-center" });
      handleCloseReviewModal();
      return;
    }

    setReviewSubmitting(true);
    try {
      if (isEditing) {
        const updated = await updateListingReview(listing.id, rating, trimmedComment);
        setExistingReview(updated);
        toast.success("Review updated successfully.", { position: "top-center" });
      } else {
        const created = await createListingReview(listing.id, rating, trimmedComment);
        setExistingReview(created);
        toast.success("Review submitted. Thank you for your feedback.", { position: "top-center" });
      }
      handleCloseReviewModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err || "Failed to submit review.");
      toast.error(message, { position: "top-center" });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!existingReview || reviewSubmitting || reviewDeleting) return;

    const confirmed = window.confirm("Delete your review for this item?");
    if (!confirmed) return;

    setReviewDeleting(true);
    try {
      await deleteListingReview(listing.id);
      setExistingReview(null);
      toast.success("Review deleted successfully.", { position: "top-center" });
      handleCloseReviewModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err || "Failed to delete review.");
      toast.error(message, { position: "top-center" });
    } finally {
      setReviewDeleting(false);
    }
  };

  const handleConfirmMarkComplete = async () => {
    if (!canMarkAsComplete || markingComplete) return;

    setMarkingComplete(true);
    try {
      await markListingAsComplete(listing.id);
      toast.success(listing.listingType === "SELL" ? "Listing marked as sold." : "Listing marked as complete.", { position: "top-center" });
      setConfirmOpen(false);
      await onMarkedComplete?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err || "Failed to complete listing transaction.");
      toast.error(message, { position: "top-center" });
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleEditPriceAction = async () => {
    if (priceSubmitting) return;
    if (newPrice <= 0) {
      toast.error("Please enter a valid price.", { position: "top-center" });
      return;
    }

    if (!isOfferChanged) {
      return;
    }

    setPriceSubmitting(true);
    try {
      if (isSeller && conversationId) {
        await updateConversationOfferAsOwner(conversationId, Math.trunc(newPrice), offerMessage);
      } else {
        await openOrCreateConversationFromListing(listing.id, Math.trunc(newPrice), offerMessage);
      }
      await onOfferUpdated?.();
      toast.success("Offer updated successfully.", { position: "top-center" });
      setEditPriceOpen(false);
      setOfferMessage("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update offer.";
      toast.error(message, { position: "top-center" });
    } finally {
      setPriceSubmitting(false);
    }

  }

  const handleCloseEditPriceModal = () => {
    setEditPriceOpen(false);
    setNewPrice(offeredPrice); // Reset to original offered price when closing modal
    setOfferMessage("");
  }

  const handleDealAction = async () => {
    if (dealSubmitting) return;
    if (!conversationId || !canDeal) return;

    setDealSubmitting(true);
    try {
      await toggleConversationDealAgreement(conversationId);
      await onOfferUpdated?.();
      toast.success("Deal agreement updated.", { position: "top-center" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update agreement.";
      toast.error(message, { position: "top-center" });
    } finally {
      setDealSubmitting(false);
    }
  }

  const handleEditScheduleAction = async (payload: {
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    message: string;
  }) => {
    try {
      await openOrCreateConversationFromListing(listing.id, undefined, undefined, {
        startDate: payload.startDate,
        endDate: payload.endDate,
        startTime: payload.startTime,
        endTime: payload.endTime,
        message: payload.message,
      });
      await onOfferUpdated?.();
      setEditScheduleOpen(false);
      toast.success("Schedule request sent.", { position: "top-center" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to request schedule.";
      toast.error(message, { position: "top-center" });
      throw err;
    }
  };

  return (
    <>
      <div
        data-listing-context-card="true"
        className="h-16 mx-3 my-2 flex items-center gap-3 px-2 py-2 rounded-xl bg-stone-50 dark:bg-[#13151f] border border-border shrink-0"
      >
        {/* Listing primary image */}
        <ImageLink
          href={`/listing/${listing.id}`}
          src={listing.imageUrl || undefined}
          type="thumbnail"
          label={listing.title}
          className="w-11 h-11"
        />

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate leading-tight">
            {listing.title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-500">
              {fmt(listing.price)} {listing.priceUnit ?? ""}
            </span>
          </div>
        </div>

        <Separator orientation="vertical" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate leading-tight">
            {listing.listingType === "SELL"
              ? "Offered Price"
              : "Provided Schedule"}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-500">
              {
                listing.listingType === "SELL"
                  ? isSold || hasTransaction && (normalizedTransactionStatus === "PENDING" || normalizedTransactionStatus === "CONFIRMED")
                    ? fmt(offeredPrice)
                    : "No offer yet"
                  : (scheduleValue || "No schedule yet")
              }
            </span>
          </div>
        </div>

        {/* Edit Price Button */}
        {!shouldHideButtons && listing.listingType === "SELL" && !isSold && (
          <button
            type="button"
            onClick={() => setEditPriceOpen(true)}
            disabled={reviewLoading}
            className="px-2.5 py-2 rounded-md text-[11px] font-semibold text-white bg-blue-700 hover:bg-blue-600 transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
            title="Edit offered price"
          >
            {!isSold && hasTransaction && (normalizedTransactionStatus === "PENDING" || normalizedTransactionStatus === "CONFIRMED")
              ? "Edit Price"
              : "Offer Price"}
          </button>
        )}

        {/* Edit Schedule Button */}
        
        {!shouldHideButtons && (listing.listingType === "RENT" || listing.listingType === "SERVICE") && (
          <button
            type="button"
            onClick={() => setEditScheduleOpen(true)}
            disabled={reviewLoading}
            className="px-2.5 py-2 rounded-md text-[11px] font-semibold text-white bg-blue-700 hover:bg-blue-600 transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
            title="Edit schedule"
          >
            {hasTransaction && (normalizedTransactionStatus === "PENDING" || normalizedTransactionStatus === "CONFIRMED")
              ? "Edit Schedule"
              : "Provide Schedule"
            }
          </button>
        )}

        {/* Deal Button */}
        {!shouldHideButtons && canDeal && (
          <button
            type="button"
            onClick={handleDealAction}
            disabled={dealSubmitting}
            className={`px-2.5 py-2 rounded-md text-[11px] font-semibold text-white transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed ${hasAgreed ? "bg-emerald-700 hover:bg-emerald-600" : "bg-blue-700 hover:bg-blue-600"}`}
            title="Deal with the offer"
          >
            {dealSubmitting
              ? "Saving..."
              : hasAgreed
                ? "Agreed"
                : "Deal"}
          </button>
        )}

        {/* Mark as complete button */}
        {!shouldHideButtons && canMarkAsComplete && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="px-2.5 py-2 rounded-md text-[11px] font-semibold text-white bg-amber-700 hover:bg-amber-600 transition-colors shrink-0"
            title={listing.listingType === "SELL" ? "Mark as Sold" : "Mark as Fulfilled"}
          >
            {listing.listingType === "SELL" ? "Mark as Sold" : "Mark as Fulfilled"}
          </button>
        )}

        {/* Review button */}
        {!shouldHideButtons && canReview && (
          <button
            type="button"
            onClick={handleOpenReviewModal}
            disabled={reviewLoading}
            className="px-2.5 py-2 rounded-md text-[11px] font-semibold text-white bg-blue-700 hover:bg-blue-600 transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
            title={existingReview ? "Edit your review" : "Review this item"}
          >
            {reviewLoading
              ? "Loading..."
              : existingReview
                ? "Edit Review"
                : "Review"}
          </button>
        )}
        
      </div>
      <ConfirmActionModal
        open={confirmOpen}
        title={listing.listingType === "SELL" ? "Mark item as sold" : "Mark transaction as fulfilled"}
        message={listing.listingType === "SELL"
          ? "Please confirm that this For Sale item has already been sold. This action will mark the listing as sold, and buyer will be able to provide review."
          : "Please confirm that this transaction is fulfilled. This will mark the transaction as completed, and client will be able to provide review."}
        confirmLabel="Confirm"
        loading={markingComplete}
        onConfirm={handleConfirmMarkComplete}
        onClose={() => setConfirmOpen(false)}
      />

      {reviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) =>
            e.target === e.currentTarget && handleCloseReviewModal()
          }
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1c1f2e] border border-stone-200 dark:border-[#2a2d3e] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200 dark:border-[#2a2d3e]">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-50">
                Review Item
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                {listing.title}
              </p>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">
                  Your rating
                </p>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((value) => {
                    const active = value <= rating;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        disabled={reviewSubmitting || reviewDeleting}
                        className="p-1 rounded-md hover:bg-stone-100 dark:hover:bg-white/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
                      >
                        <Star
                          className={`w-6 h-6 ${active ? "fill-amber-400 text-amber-400" : "text-stone-300 dark:text-stone-600"}`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2 block">
                  Comment
                </label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={reviewSubmitting || reviewDeleting}
                  placeholder="Share your experience with this transaction..."
                  className="w-full bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl px-3 py-2.5 text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 outline-none focus:border-stone-400 dark:focus:border-stone-500 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                {existingReview ? (
                  <button
                    type="button"
                    onClick={handleDeleteReview}
                    disabled={reviewSubmitting || reviewDeleting}
                    className="px-4 py-2 rounded-full text-xs font-semibold border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {reviewDeleting ? "Deleting..." : "Delete"}
                  </button>
                ) : (
                  <span />
                )}

                <button
                  type="button"
                  onClick={handleReviewAction}
                  disabled={reviewSubmitting || reviewDeleting}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                    rating > 0
                      ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:opacity-90"
                      : "border border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[#252837]"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {reviewSubmitting
                    ? existingReview
                      ? "Updating..."
                      : "Submitting..."
                    : rating > 0
                      ? "Submit"
                      : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) =>
            e.target === e.currentTarget && handleCloseReviewModal()
          }
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1c1f2e] border border-stone-200 dark:border-[#2a2d3e] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200 dark:border-[#2a2d3e]">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-50">
                Review Item
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                {listing.title}
              </p>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">
                  Your rating
                </p>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((value) => {
                    const active = value <= rating;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        disabled={reviewSubmitting || reviewDeleting}
                        className="p-1 rounded-md hover:bg-stone-100 dark:hover:bg-white/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
                      >
                        <Star
                          className={`w-6 h-6 ${active ? "fill-amber-400 text-amber-400" : "text-stone-300 dark:text-stone-600"}`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2 block">
                  Comment
                </label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={reviewSubmitting || reviewDeleting}
                  placeholder="Share your experience with this transaction..."
                  className="w-full bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl px-3 py-2.5 text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 outline-none focus:border-stone-400 dark:focus:border-stone-500 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                {existingReview ? (
                  <button
                    type="button"
                    onClick={handleDeleteReview}
                    disabled={reviewSubmitting || reviewDeleting}
                    className="px-4 py-2 rounded-full text-xs font-semibold border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {reviewDeleting ? "Deleting..." : "Delete"}
                  </button>
                ) : (
                  <span />
                )}

                <button
                  type="button"
                  onClick={handleReviewAction}
                  disabled={reviewSubmitting || reviewDeleting}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                    rating > 0
                      ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:opacity-90"
                      : "border border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[#252837]"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {reviewSubmitting
                    ? existingReview
                      ? "Updating..."
                      : "Submitting..."
                    : rating > 0
                      ? "Submit"
                      : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <OfferModal
        open={editPriceOpen}
        title="Edit Offered Price"
        subtitle={listing.title}
        listedPrice={listing.price}
        offerAmount={String(newPrice)}
        onOfferAmountChange={(value) => setNewPrice(Number.parseInt(value || "0", 10) || 0)}
        note={offerMessage}
        onNoteChange={setOfferMessage}
        noteLabel="Add a message (optional)"
        notePlaceholder="e.g. Updated offer based on our discussion."
        submitLabel="Update Offer"
        submitDisabled={!isOfferChanged}
        submitting={priceSubmitting}
        onSubmit={handleEditPriceAction}
        onClose={handleCloseEditPriceModal}
      />

      <ScheduleModal
        open={editScheduleOpen}
        onClose={() => setEditScheduleOpen(false)}
        onSubmit={handleEditScheduleAction}
        listingTitle={listing.title}
        listingPrice={listing.price}
        priceUnit={listing.priceUnit ?? ""}
        availableFrom={listing.availableFrom}
        daysOff={listing.daysOff ?? []}
        timeWindows={listing.timeWindows ?? []}
        initialStartAt={listing.scheduleStart}
        initialEndAt={listing.scheduleEnd}
        submitLabel={hasTransaction && (normalizedTransactionStatus === "PENDING" || normalizedTransactionStatus === "CONFIRMED")
          ? "Update Schedule"
          : "Request Schedule"}
      />

    </>
  );
}
