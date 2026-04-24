


"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ConversationListing } from "@/types/messaging";
import {
  type ListingReviewPayload,
} from "@/services/listingDetailService";
import { type ScheduleRequestPayload } from "@/services/messagingService";
import { ConfirmActionModal } from "@/components/confirm-action-modal"; 
import OfferModal from "@/components/offer-modal";
import { ScheduleModal } from "@/components/schedule-modal";
import { ModalFormCard } from "../modal-form-card";
import { ImageLink } from "../image-link";
import { formatPrice } from "@/utils/string-builder";
import { useListingContextActions } from "./use-listing-context-actions";

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
  const {
    actionState,
    state: {
      markCompleteOpen,
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
      setMarkCompleteOpen,
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
      handleConfirmMarkComplete,
      handleEditPriceAction,
      handleCloseEditPriceModal,
      handleDealAction,
      handleEditScheduleAction,
    },
  } = useListingContextActions({
    listing,
    isSeller,
    hideActionButtons,
    conversationId,
    onMarkedComplete,
    onOfferUpdated,
  });

  const {
    normalizedTransactionStatus,
    isSold,
    shouldHideButtons,
    hasTransaction,
    canMarkAsComplete,
    canDeal,
    hasAgreed,
    canReview,
    offeredPrice,
    scheduleValue,
    canEditPrice,
    canEditSchedule,
  } = actionState;
  const isOfferChanged = Math.trunc(newPrice) !== Math.trunc(offeredPrice) || !hasTransaction;
  const REVIEW_MAX_LENGTH = 500;

  return (
    <>
      <div
        data-listing-context-card="true"
        className="h-16 mx-5 my-2 flex items-center gap-3 px-2 py-2 rounded-lg bg-stone-50 dark:bg-[#13151f] border border-border shrink-0"
      >
        {/* Listing primary image */}
        <ImageLink
          href={`/listing/${listing.id}`}
          src={listing.imageUrl || undefined}
          type="thumbnail"
          label={listing.title}
          className="w-11 h-11"
        />
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate leading-tight">
            {listing.title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-500">
              {formatPrice(listing.price)} {listing.priceUnit ?? ""}
            </span>
          </div>
        </div>

        {/* Hidden in mobile */}

        {/* Offered Price / Schedule */}
        <div className="hidden min-w-0 sm:block md:flex-1">
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
                    ? formatPrice(offeredPrice)
                    : "No offer yet"
                  : (scheduleValue || "No schedule yet")
              }
            </span>
          </div>
        </div>

        <div className="hidden lg:flex gap-4">
          {/* Edit Price Button */}
          {canEditPrice && (
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
          
          {canEditSchedule && (
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
              onClick={() => setMarkCompleteOpen(true)}
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
        
      </div>
      <ConfirmActionModal
        open={markCompleteOpen}
        title={listing.listingType === "SELL" ? "Mark item as sold" : "Mark transaction as fulfilled"}
        message={listing.listingType === "SELL"
          ? "Please confirm that this For Sale item has already been sold. This action will mark the listing as sold, and buyer will be able to provide review."
          : "Please confirm that this transaction is fulfilled. This will mark the transaction as completed, and client will be able to provide review."}
        confirmLabel="Confirm"
        loading={markingComplete}
        onConfirm={handleConfirmMarkComplete}
        onClose={() => setMarkCompleteOpen(false)}
      />

      {reviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) =>
            e.target === e.currentTarget && handleCloseReviewModal()
          }
        >
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-[#1c1f2e] border border-stone-200 dark:border-[#2a2d3e] shadow-2xl overflow-hidden">
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
                        className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-white/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
                <div className="space-y-1">
                  <textarea
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, REVIEW_MAX_LENGTH))}
                    maxLength={REVIEW_MAX_LENGTH}
                    disabled={reviewSubmitting || reviewDeleting}
                    placeholder="Share your experience with this transaction..."
                    className="w-full bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl px-3 py-2.5 text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 outline-none focus:border-stone-400 dark:focus:border-stone-500 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <p className="text-right text-[11px] text-stone-500 dark:text-stone-400">
                    {comment.length}/{REVIEW_MAX_LENGTH}
                  </p>
                </div>
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
        <ModalFormCard
          icon={Star}
          type='review'
          title="Review Item"
          subTitle={listing.title}
          onClose={handleCloseReviewModal}
          onCancel={handleDeleteReview}
          handleSend={handleReviewAction}
          canSend={rating > 0}
          sending={reviewSubmitting}
          submitLabel="Submit"
          cancelLabel="Delete"
        >

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
                      className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-white/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
              <div className="space-y-1">
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, REVIEW_MAX_LENGTH))}
                  maxLength={REVIEW_MAX_LENGTH}
                  disabled={reviewSubmitting || reviewDeleting}
                  placeholder="Share your experience with this transaction..."
                  className="w-full bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl px-3 py-2.5 text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 outline-none focus:border-stone-400 dark:focus:border-stone-500 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <p className="text-right text-[11px] text-stone-500 dark:text-stone-400">
                  {comment.length}/{REVIEW_MAX_LENGTH}
                </p>
              </div>
            </div>
        </ModalFormCard>
      )}

      {editPriceOpen && (
        <OfferModal
          open={editPriceOpen}
          title="Edit Offered Price"
          subtitle={listing.title}
          listedPrice={listing.price}
          offerAmount={String(newPrice)}
          onOfferAmountChange={(value) => setNewPrice(Number.parseInt(value, 10))}
          note={offerMessage}
          onNoteChange={setOfferMessage}
          submitLabel="Update Offer"
          submitDisabled={!isOfferChanged}
          submitting={priceSubmitting}
          onSubmit={handleEditPriceAction}
          onClose={handleCloseEditPriceModal}
        />
      )}

      {editScheduleOpen && (
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
          type={listing.listingType.toLowerCase()}
        />
      )}

    </>
  );
}
