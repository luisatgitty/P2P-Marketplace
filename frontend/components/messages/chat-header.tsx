"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreVertical, User, ExternalLink, Flag, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Conversation } from "@/types/messaging";
import { useUser } from "@/utils/UserContext";
import { submitUserListingReport } from "@/services/listingDetailService";
import { ReportModal } from "@/components/report-modal";
import ListingTypeBadge from "./listing-type-badge";

interface ChatHeaderProps {
  conversation: Conversation;
  onDelete?: () => void;
}

export default function ChatHeader({ conversation, onDelete }: ChatHeaderProps) {
  const router = useRouter();
  const { isAuth } = useUser();
  const { otherParticipant, listing } = conversation;
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileHref = otherParticipant.id ? `/profile?userId=${otherParticipant.id}` : "/profile";

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
    { icon: User,         label: "View Profile",   action: () => { router.push(profileHref); setMenuOpen(false); } },
    { icon: ExternalLink, label: "View Listing",   action: () => { router.push(`/listing/${listing.id}`); setMenuOpen(false); } },
    { icon: Flag,         label: "Report User",    action: () => { setMenuOpen(false); setReportOpen(true); }, danger: false },
    { icon: Trash2,       label: "Delete Chat",    action: () => { onDelete?.(); setMenuOpen(false); }, danger: true },
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
      <button
        onClick={() => router.push(profileHref)}
        className="relative shrink-0 rounded-full"
        aria-label="View user profile"
      >
        <div className="w-9 h-9 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center overflow-hidden select-none">
          {otherParticipant.profileImageUrl ? (
            <img src={otherParticipant.profileImageUrl} alt={otherParticipant.firstName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-stone-600 dark:text-stone-300">{initials}</span>
          )}
        </div>
        {otherParticipant.isOnline && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1c1f2e]" />
        )}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-stone-900 dark:text-stone-50 truncate">
            {otherParticipant.firstName} {otherParticipant.lastName}
          </span>
          <ListingTypeBadge type={listing.listingType} />
        </div>
        <p className={cn(
          "text-[11px] font-medium",
          otherParticipant.isOnline ? "text-emerald-500" : "text-stone-400 dark:text-stone-500"
        )}>
          {otherParticipant.isOnline ? "Online" : "Offline"}
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
    </>
  );
}
