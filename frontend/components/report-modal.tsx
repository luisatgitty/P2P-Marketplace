"use client";

import { useEffect, useState } from "react";
import { ModalHeader } from "./modal-header";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

const REPORT_REASONS = [
  "Scam / Fraud",
  "Prohibited item",
  "Fake / Counterfeit",
  "Wrong category",
  "Spam / Duplicate",
  "Other",
] as const;

interface ReportModalProps {
  open: boolean;
  title: string;
  subtitle: string;
  target: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: { reason: string; description: string }) => Promise<void> | void;
}

export function ReportModal({
  open,
  title,
  subtitle,
  target,
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

  const handleSubmit = () => {
    if (!reason) return;
    void onSubmit({ reason, description: details });
  };

  if (!open) return null;

  return (
    <ModalHeader
      icon={Flag}
      type='report'
      title={title}
      subTitle={target}
      onClose={onClose}
      handleSend={handleSubmit}
      canSend={!!reason}
      sending={submitting}
      submitLabel="Submit Report"
    >
        <p className="text-sm text-stone-500 dark:text-stone-400">{subtitle}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

        <div>
          <label className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2 block">
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
    </ModalHeader>
  );
}
