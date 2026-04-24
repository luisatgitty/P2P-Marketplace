"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreVertical, User, ExternalLink, Flag, Trash2, CheckCircle, Edit2, CalendarDays, Handshake, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Conversation } from "@/types/messaging";
import { useUser } from "@/utils/UserContext";
import { useConfirmDialog } from "@/utils/ConfirmDialogContext";
import { submitUserListingReport } from "@/services/listingDetailService";
import { ReportModal } from "@/components/report-modal";
import { ConfirmActionModal } from "@/components/confirm-action-modal";
import ListingTypeBadge from "@/components/listing-type-badge";
import VerificationBadge from "@/components/verification-badge";
import { ImageLink } from "../image-link";
import OfferModal from "@/components/offer-modal";
import { ScheduleModal } from "@/components/schedule-modal";
import { useListingContextActions } from "./use-listing-context-actions";

interface ChatHeaderProps {
  conversation: Conversation;
  onDelete?: () => void;
  onMarkedComplete?: () => void | Promise<void>;
  onOfferUpdated?: () => void | Promise<void>;
}

export default function ChatHeader({ conversation, onDelete, onMarkedComplete, onOfferUpdated }: ChatHeaderProps) {
  const router = useRouter();
  const { isAuth } = useUser();
  const { otherParticipant, listing } = conversation;
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileHref = otherParticipant.id ? `/profile?userId=${otherParticipant.id}` : "/profile";
  const normalizedListingStatus = String(listing.status ?? "").trim().toUpperCase();
  const isBlockedListingStatus = normalizedListingStatus === "BANNED" || normalizedListingStatus === "DELETED";
  const isParticipantUnavailable = otherParticipant.isActive === false || otherParticipant.isLocked === true;
  const hideParticipantMenuItems = isBlockedListingStatus || isParticipantUnavailable;
  const hideReportUserMenuItem = hideParticipantMenuItems || conversation.hasPendingReport === true;
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
    isSeller: conversation.isSeller,
    hideActionButtons: conversation.canSendMessage === false || isBlockedListingStatus,
    conversationId: conversation.id,
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
    canEditPrice,
    canEditSchedule,
  } = actionState;
  const isOfferChanged = Math.trunc(newPrice) !== Math.trunc(offeredPrice) || !hasTransaction;
  const REVIEW_MAX_LENGTH = 500;
  const cityOrMunicipality = (
    otherParticipant.cityMunicipality
    ?? otherParticipant.city_municipality
    ?? otherParticipant.municipality
    ?? otherParticipant.city
    ?? ""
  ).trim();
  const province = (otherParticipant.province ?? "").trim();
  const participantAddress = [cityOrMunicipality, province].filter(Boolean).join(", ")
    || (otherParticipant.location ?? "").trim()
    || "Location unavailable";
  const isParticipantVerified = String(otherParticipant.status ?? "").trim().toLowerCase() === "verified";

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSubmitReport = async (payload: { reason: string; description: string }) => {
    if (!isAuth) {
      router.push("/login");
      return;
    }

    if (submittingReport) return;

    setSubmittingReport(true);
    try {
      await submitUserListingReport(listing.id, otherParticipant.id, payload.reason, payload.description);
      toast.success("Report submitted. Thank you for helping keep the community safe.", { position: "top-center" });
      setReportOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err || "Failed to submit report.");
      toast.error(message, { position: "top-center" });
    } finally {
      setSubmittingReport(false);
    }
  };

  const { openDialog } = useConfirmDialog();

  const handleDeleteChat = () => {
    openDialog({
      title: "Delete Conversation",
      message: "Are you sure you want to delete this conversation? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      isDangerous: true,
      onConfirm: () => {
        onDelete?.();
        setMenuOpen(false);
        toast.success("Conversation deleted.", { position: "top-center" });
      },
      onCancel: () => setMenuOpen(false),
    });
  };

  const menuItems = [
    ...(!hideParticipantMenuItems ? [{ icon: User, label: "View Profile", action: () => { router.push(profileHref); setMenuOpen(false); } }] : []),
    { icon: ExternalLink, label: "View Listing",   action: () => { router.push(`/listing/${listing.id}`); setMenuOpen(false); } },
    ...(canEditPrice ? [{ icon: Edit2, label: !isSold && hasTransaction && (normalizedTransactionStatus === "PENDING" || normalizedTransactionStatus === "CONFIRMED") ? "Edit Price" : "Offer Price", action: () => { setMenuOpen(false); setEditPriceOpen(true); }, danger: false }] : []),
    ...(canEditSchedule ? [{ icon: CalendarDays, label: hasTransaction && (normalizedTransactionStatus === "PENDING" || normalizedTransactionStatus === "CONFIRMED") ? "Edit Schedule" : "Provide Schedule", action: () => { setMenuOpen(false); setEditScheduleOpen(true); }, danger: false }] : []),
    ...(!shouldHideButtons && canDeal ? [{ icon: Handshake, label: hasAgreed ? "Agreed" : "Deal", action: () => { setMenuOpen(false); void handleDealAction(); }, danger: false, disabled: dealSubmitting }] : []),
    ...(!shouldHideButtons && canMarkAsComplete ? [{ icon: CheckCircle, label: listing.listingType === "SELL" ? "Mark as Sold" : "Mark as Complete", action: () => { setMenuOpen(false); setMarkCompleteOpen(true); }, danger: false }] : []),
    ...(!shouldHideButtons && canReview ? [{ icon: Star, label: reviewLoading ? "Loading Review..." : existingReview ? "Edit Review" : "Review", action: () => { setMenuOpen(false); handleOpenReviewModal(); }, danger: false, disabled: reviewLoading }] : []),
    ...(!hideReportUserMenuItem ? [{ icon: Flag, label: "Report User", action: () => { setMenuOpen(false); setReportOpen(true); }, danger: false }] : []),
    { icon: Trash2,       label: "Delete Chat",    action: handleDeleteChat, danger: true },
  ];

  return (
    <>
    <header className="flex items-center gap-3 px-4 pt-4 pb-2 border-b border-border bg-white dark:bg-[#1c1f2e] shrink-0">

      {/* Back button (mobile only) */}
      <button
        onClick={() => router.push("/messages")}
        className="md:hidden p-1.5 -ml-1 rounded-lg text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5 transition-colors"
        aria-label="Back to conversations"
      >
        <ArrowLeft size={18} />
      </button>

      {/* Avatar */}
      <ImageLink
        href={profileHref}
        src={otherParticipant.profileImageUrl || undefined}
        type="profile"
        label={`${otherParticipant.firstName} ${otherParticipant.lastName}`}
        className="relative shrink-0 rounded-full"
      >
        {otherParticipant.isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1c1f2e]" />
        )}
      </ImageLink>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-stone-900 dark:text-stone-50 truncate">
            {otherParticipant.firstName} {otherParticipant.lastName}
          </span>
          <VerificationBadge verified={isParticipantVerified} />
          <ListingTypeBadge type={listing.listingType} status={listing.status} />
        </div>
        <p className={cn(
          "text-[11px] font-medium",
          "text-stone-500 dark:text-stone-400"
        )}>
          {participantAddress}
        </p>
      </div>

      {/* More menu */}
      <div className="flex items-center gap-0.5 shrink-0">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 rounded-lg text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5 transition-colors"
            aria-label="More options"
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1c1f2e] border border-border rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
              {menuItems.map(({ icon: Icon, label, action, danger, disabled }) => (
                <button
                  key={label}
                  onClick={action}
                  disabled={disabled}
                  className={cn(
                    "flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
                    danger
                      ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      : "text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/5"
                  )}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
    <ReportModal
      open={reportOpen}
      title="Report User"
      subtitle="Why are you reporting this user?"
      target={`${otherParticipant.firstName} ${otherParticipant.lastName}`}
      submitting={submittingReport}
      onClose={() => setReportOpen(false)}
      onSubmit={handleSubmitReport}
    />
    <ConfirmActionModal
      open={markCompleteOpen}
      title={listing.listingType === "SELL" ? "Mark item as sold" : "Mark transaction as complete"}
      message={listing.listingType === "SELL"
        ? "Please confirm that this For Sale item has already been sold. This action will mark the listing as SOLD."
        : "Please confirm that this transaction is complete. This will mark the confirmed transaction as COMPLETED."}
      confirmLabel="Confirm"
      loading={markingComplete}
      onConfirm={handleConfirmMarkComplete}
      onClose={() => setMarkCompleteOpen(false)}
    />
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
      type={listing.listingType}
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
    </>
  );
}
