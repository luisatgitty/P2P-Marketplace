"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreVertical, User, ExternalLink, Flag, Trash2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Conversation } from "@/types/messaging";
import { useUser } from "@/utils/UserContext";
import { markListingAsComplete, submitUserListingReport } from "@/services/listingDetailService";
import { ReportModal } from "@/components/report-modal";
import { ConfirmActionModal } from "@/components/confirm-action-modal";
import ListingTypeBadge from "@/components/listing-type-badge";
import VerificationBadge from "@/components/verification-badge";
import { ImageLink } from "../image-link";

interface ChatHeaderProps {
  conversation: Conversation;
  onDelete?: () => void;
  onMarkedComplete?: () => void | Promise<void>;
}

export default function ChatHeader({ conversation, onDelete, onMarkedComplete }: ChatHeaderProps) {
  const router = useRouter();
  const { isAuth } = useUser();
  const { otherParticipant, listing } = conversation;
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [markCompleteOpen, setMarkCompleteOpen] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileHref = otherParticipant.id ? `/profile?userId=${otherParticipant.id}` : "/profile";
  const normalizedListingStatus = String(listing.status ?? "").trim().toUpperCase();
  const isBlockedListingStatus = normalizedListingStatus === "BANNED" || normalizedListingStatus === "DELETED";
  const isParticipantUnavailable = otherParticipant.isActive === false || otherParticipant.isLocked === true;
  const hideParticipantMenuItems = isBlockedListingStatus || isParticipantUnavailable;
  const hideReportUserMenuItem = hideParticipantMenuItems || conversation.hasPendingReport === true;
  const isTransactionConfirmed = String(listing.transactionStatus ?? "").trim().toUpperCase() === "CONFIRMED";
  const canMarkAsComplete = conversation.isSeller && isTransactionConfirmed && (listing.listingType !== "SELL" || listing.status !== "SOLD");
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

  const initials = `${otherParticipant.firstName[0]}${otherParticipant.lastName[0]}`.toUpperCase();

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

  const menuItems = [
    ...(!hideParticipantMenuItems ? [{ icon: User, label: "View Profile", action: () => { router.push(profileHref); setMenuOpen(false); } }] : []),
    { icon: ExternalLink, label: "View Listing",   action: () => { router.push(`/listing/${listing.id}`); setMenuOpen(false); } },
    ...(canMarkAsComplete ? [{ icon: CheckCircle, label: listing.listingType === "SELL" ? "Mark as Sold" : "Mark as Complete", action: () => { setMenuOpen(false); setMarkCompleteOpen(true); }, danger: false }] : []),
    ...(!hideReportUserMenuItem ? [{ icon: Flag, label: "Report User", action: () => { setMenuOpen(false); setReportOpen(true); }, danger: false }] : []),
    { icon: Trash2,       label: "Delete Chat",    action: () => { onDelete?.(); setMenuOpen(false); }, danger: true },
  ];

  const handleConfirmMarkComplete = async () => {
    if (!canMarkAsComplete || markingComplete) return;

    setMarkingComplete(true);
    try {
      await markListingAsComplete(listing.id);
      toast.success(listing.listingType === "SELL" ? "Listing marked as sold." : "Listing marked as complete.", { position: "top-center" });
      setMarkCompleteOpen(false);
      await onMarkedComplete?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err || "Failed to complete listing transaction.");
      toast.error(message, { position: "top-center" });
    } finally {
      setMarkingComplete(false);
    }
  };

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
            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1c1f2e] border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
              {menuItems.map(({ icon: Icon, label, action, danger }) => (
                <button
                  key={label}
                  onClick={action}
                  className={cn(
                    "flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs font-medium transition-colors",
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
    </>
  );
}
