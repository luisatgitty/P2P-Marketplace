


"use client";

import Link from "next/link";
import { ExternalLink, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ConversationListing } from "@/types/messaging";
import {
  createListingReview,
  deleteListingReview,
  getMyListingReview,
  markListingAsSold,
  updateListingReview,
  type ListingReviewPayload,
} from "@/services/listingDetailService";
import { ConfirmActionModal } from "@/components/confirm-action-modal";

interface ListingContextCardProps {
  listing: ConversationListing;
  buyerId?: string;
  isSeller?: boolean;
  onMarkedSold?: () => void;
}

export default function ListingContextCard({ listing, buyerId, isSeller = false, onMarkedSold }: ListingContextCardProps) {
  const fmt = (n: number) =>
    "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 0 });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [markingSold, setMarkingSold] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDeleting, setReviewDeleting] = useState(false);
  const [existingReview, setExistingReview] = useState<ListingReviewPayload | null>(null);

  const normalizedStatus = String(listing.status ?? "").trim().toUpperCase();
  const isSold = normalizedStatus === "SOLD";
  const canMarkAsSold = isSeller && listing.listingType === "SELL" && !isSold;
  const canReviewSoldItem = !isSeller && listing.listingType === "SELL" && isSold;

  useEffect(() => {
    let mounted = true;

    const loadExistingReview = async () => {
      if (!canReviewSoldItem) {
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
  }, [canReviewSoldItem, listing.id]);

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

  const handleConfirmMarkSold = async () => {
    if (!canMarkAsSold || !buyerId || markingSold) return;

    setMarkingSold(true);
    try {
      await markListingAsSold(listing.id, buyerId);
      toast.success("Listing marked as sold.", { position: "top-center" });
      setConfirmOpen(false);
      onMarkedSold?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err || "Failed to mark listing as sold.");
      toast.error(message, { position: "top-center" });
    } finally {
      setMarkingSold(false);
    }
  };

  return (
    <>
    <div data-listing-context-card="true" className="mx-3 my-2 flex items-center gap-3 px-2 py-2 rounded-xl bg-stone-50 dark:bg-[#13151f] border border-border shrink-0">
      {/* Listing primary image */}
      <Link
        href={`/listing/${listing.id}`}
        className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-border bg-stone-100 dark:bg-[#0f1117]"
        title="View listing"
      >
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-base">📦</div>
        )}
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-stone-800 dark:text-stone-100 truncate leading-tight">
          {listing.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs font-bold text-amber-700 dark:text-amber-500">
            {fmt(listing.price)} {listing.priceUnit ?? ""}
          </span>
        </div>
      </div>

      {/* View link */}
      {canMarkAsSold && (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="px-2.5 py-2 rounded-md text-[11px] font-semibold text-white bg-amber-700 hover:bg-amber-600 transition-colors shrink-0"
          title="Mark listing as sold"
        >
          Mark as Sold
        </button>
      )}

      {canReviewSoldItem && (
        <button
          type="button"
          onClick={handleOpenReviewModal}
          disabled={reviewLoading}
          className="px-2.5 py-2 rounded-md text-[11px] font-semibold text-white bg-blue-700 hover:bg-blue-600 transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
          title={existingReview ? "Edit your review" : "Review this item"}
        >
          {reviewLoading ? "Loading..." : existingReview ? "Edit Review" : "Review"}
        </button>
      )}

      <Link
        href={`/listing/${listing.id}`}
        className="p-2 rounded-md text-stone-400 dark:text-stone-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors shrink-0"
        title="View listing"
      >
        <ExternalLink size={14} />
      </Link>
    </div>
    <ConfirmActionModal
      open={confirmOpen}
      title="Mark item as sold"
      message="Please confirm that this For Sale item has already been sold. This action will mark the listing as SOLD."
      confirmLabel="Confirm"
      loading={markingSold}
      onConfirm={handleConfirmMarkSold}
      onClose={() => setConfirmOpen(false)}
    />

    {reviewOpen && (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && handleCloseReviewModal()}
      >
        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1c1f2e] border border-stone-200 dark:border-[#2a2d3e] shadow-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-200 dark:border-[#2a2d3e]">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-50">Review Item</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">{listing.title}</p>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">Your rating</p>
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
              <label className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2 block">Comment</label>
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
              ) : <span />}

              <button
                type="button"
                onClick={handleReviewAction}
                disabled={reviewSubmitting || reviewDeleting}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${rating > 0
                  ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:opacity-90"
                  : "border border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[#252837]"} disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {reviewSubmitting ? (existingReview ? "Updating..." : "Submitting...") : (rating > 0 ? "Submit" : "Cancel")}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
