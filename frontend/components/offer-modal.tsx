"use client";

import { useMemo } from "react";
import { formatPrice } from "@/utils/string-builder";

interface OfferModalProps {
  open: boolean;
  title: string;
  subtitle: string;
  listedPrice: number;
  offerAmount: string;
  onOfferAmountChange: (value: string) => void;
  note: string;
  onNoteChange: (value: string) => void;
  noteLabel?: string;
  notePlaceholder?: string;
  submitLabel: string;
  submitDisabled?: boolean;
  submitting?: boolean;
  onSubmit: () => void;
  onClose: () => void;
  presets?: number[];
}

export default function OfferModal({
  open,
  title,
  subtitle,
  listedPrice,
  offerAmount,
  onOfferAmountChange,
  note,
  onNoteChange,
  noteLabel = "Add a message (optional)",
  notePlaceholder = "Add context for your offer...",
  submitLabel,
  submitDisabled = false,
  submitting = false,
  onSubmit,
  onClose,
  presets = [1.0, 0.9, 0.85, 0.8],
}: OfferModalProps) {
  const presetValues = useMemo(
    () => presets.map((p) => ({ label: `${Math.round(p * 100)}%`, value: String(Math.round(listedPrice * p)) })),
    [listedPrice, presets],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-[#1e2433] px-6 py-5">
          <h2 className="text-white font-bold text-lg">{title}</h2>
          <p className="text-slate-400 text-sm mt-1 truncate">{subtitle}</p>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400 mb-2">
              <span>Your offer</span>
              <span>Listed at {formatPrice(listedPrice)}</span>
            </div>

            <div className="flex items-center border-2 border-stone-200 dark:border-[#2a2d3e] rounded-xl overflow-hidden focus-within:border-stone-400 dark:focus-within:border-stone-500 transition-colors">
              <span className="px-4 text-stone-400 dark:text-stone-500 font-semibold text-sm bg-stone-50 dark:bg-[#13151f] py-3 border-r border-stone-200 dark:border-[#2a2d3e]">
                ₱
              </span>
              <input
                type="number"
                value={offerAmount}
                onChange={(e) => onOfferAmountChange(e.target.value)}
                className="flex-1 px-4 py-3 text-stone-900 dark:text-stone-50 bg-transparent text-sm font-semibold outline-none"
              />
            </div>

            <div className="flex gap-2 mt-2">
              {presetValues.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => onOfferAmountChange(preset.value)}
                  className="flex-1 text-xs py-1.5 rounded-full border border-stone-200 dark:border-[#2a2d3e] text-stone-500 dark:text-stone-400 hover:border-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 block">{noteLabel}</label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder={notePlaceholder}
              className="w-full bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl px-3 py-2.5 text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 outline-none focus:border-stone-400 dark:focus:border-stone-500 resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-full border border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300 text-sm font-semibold hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={submitting || submitDisabled}
              className="flex-1 py-3 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {submitting ? "Submitting..." : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
