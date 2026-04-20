"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
 
const REPORT_REASONS = [
  "Scam / Fraud",
  "Prohibited",
  "Spam / Duplicate",
  "Listing Issue",
  "Transaction Issue",
  "Other"
];

interface ReportModalProps {
  open: boolean;
  title?: string;
  subtitle?: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: { reason: string; description: string }) => Promise<void> | void;
}

export function ReportModal({
  open,
  title = "Report Listing",
  subtitle = "What's wrong with this listing?",
  submitting = false,
  onClose,
  onSubmit,
}: ReportModalProps) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const REPORT_MAX_LENGTH = 500;

  useEffect(() => {
    if (!open) {
      setReason(null);
      setDetails("");
    }
  }, [open]);

  const handleDetailsChange = (value: string) => {
    if (value.length > REPORT_MAX_LENGTH) return;
    else setDetails(value.slice(0, REPORT_MAX_LENGTH));
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-[#1c1f2e] rounded-lg w-full max-w-sm shadow-2xl p-6">
        <h2 className="font-bold text-stone-900 dark:text-stone-50 text-lg mb-1">{title}</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">{subtitle}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
          {REPORT_REASONS.map((item) => (
            <button
              key={item}
              onClick={() => setReason(item)}
              className={cn(
                "text-left text-sm px-4 py-3 rounded-lg border transition-colors",
                reason === item
                  ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-950/30 dark:border-red-700 dark:text-red-300"
                  : "text-stone-700 dark:text-stone-200 border-stone-200 dark:border-[#2a2d3e] hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 dark:hover:border-red-800"
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mb-5">
          <label className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 block">
            Report details
          </label>
          <textarea
            rows={4}
            value={details}
            onChange={(e) => handleDetailsChange(e.target.value)}
            maxLength={REPORT_MAX_LENGTH}
            placeholder="Describe what happened or why this should be reviewed..."
            className="w-full bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-lg px-3 py-2.5 text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 outline-none focus:border-stone-400 dark:focus:border-stone-500 resize-none"
          />
          <p className="mt-1 text-[11px] text-stone-400 dark:text-stone-500 text-right">{details.length}/{REPORT_MAX_LENGTH}</p>
        </div>

        {reason ? (
          <button
            onClick={() => void onSubmit({ reason, description: details })}
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        ) : (
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg border border-stone-200 dark:border-[#2a2d3e] text-stone-500 dark:text-stone-400 text-sm hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
