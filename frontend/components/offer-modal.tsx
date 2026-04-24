"use client";

import { useMemo } from "react";
import { HandHelping } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { ModalFormCard } from "./modal-form-card";
import { formatPrice } from "@/utils/string-builder";
import { isValidPrice } from "@/utils/validation";
import { MESSAGE_MAX_LENGTH, limitMessageInputLength } from "@/utils/validation";

interface OfferModalProps {
  open: boolean;
  title: string;
  subtitle: string;
  listedPrice: number;
  offerAmount: string;
  onOfferAmountChange: (value: string) => void;
  note: string;
  onNoteChange: (value: string) => void;
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
  submitLabel,
  submitDisabled = false,
  submitting = false,
  onSubmit,
  onClose,
  presets = [1.0, 0.95, 0.9, 0.8, 0.6],
}: OfferModalProps) {
  const presetValues = useMemo(
    () => presets.map((p) => ({ label: `${Math.round(p * 100)}%`, value: String(Math.round(listedPrice * p)) })),
    [listedPrice, presets],
  );

  if (!open) return null;

  return (
    <ModalFormCard
      icon={HandHelping}
      type='SELL'
      title={title}
      subTitle={subtitle}
      onClose={onClose}
      handleSend={onSubmit}
      canSend={!submitDisabled}
      sending={submitting}
      submitLabel={submitLabel}
    >
      <div className="mb-4">
        <div className="flex justify-between text-sm text-stone-500 dark:text-stone-400 mb-2">
          <span>Your offer</span>
          <span>Listed at {formatPrice(listedPrice)}</span>
        </div>

        <div className="flex items-center border-2 border-stone-200 dark:border-[#2a2d3e] rounded-lg overflow-hidden focus-within:border-stone-400 dark:focus-within:border-stone-500 transition-colors">
          <span className="px-4 text-stone-400 dark:text-stone-500 font-semibold text-md bg-stone-50 dark:bg-[#13151f] py-2 border-r border-stone-200 dark:border-[#2a2d3e]">
            ₱
          </span>
          <input
            type="number"
            value={offerAmount}
            onChange={(e) => {
              const nextValue = e.target.value;
              if (!nextValue) onOfferAmountChange("");
              if (!isValidPrice(nextValue)) return;
              onOfferAmountChange(nextValue)
            }}
            onKeyDown={(e) => {
              if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E" || e.key === ".") {
                e.preventDefault();
              }
            }}
            className="flex-1 px-3 text-stone-900 dark:text-stone-50 bg-transparent text-sm font-semibold outline-none"
          />
        </div>

        <div className="flex gap-2 mt-4">
          {presetValues.map((preset) => (
            <button
              key={preset.label}
              onClick={() => onOfferAmountChange(preset.value)}
              className="flex-1 text-sm py-1.5 rounded-lg border-2 border-stone-200 dark:border-[#2a2d3e] text-stone-500 dark:text-stone-400 hover:border-stone-400 hover:text-stone-700 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-2 block">
          Message{" "}
          <span className="font-normal normal-case tracking-normal text-stone-400 dark:text-stone-500">
            (optional)
          </span>
        </label>
        <Textarea
          rows={3}
          value={note}
          onChange={(e) => onNoteChange(limitMessageInputLength(e.target.value))}
          maxLength={MESSAGE_MAX_LENGTH}
          placeholder={'Add context for your offer...'}
          className="w-full max-h-24 bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-lg px-3 py-2.5 text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 outline-none focus:border-stone-400 dark:focus:border-stone-500 resize-none"
        />
      </div>
    </ModalFormCard>
  );
}
