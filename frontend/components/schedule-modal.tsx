"use client";

import { useState } from "react";
import {
  X, Package, Clock, ClockIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { BookingCalendar, type BookingCalendarColors } from "./ui/booking-calendar";

// ── Formatting ─────────────────────────────────────────────────────────────────
const phpFmt = new Intl.NumberFormat("en-PH", {
  style: "currency", currency: "PHP", minimumFractionDigits: 0,
});

// ── Constants ──────────────────────────────────────────────────────────────────
const TIME_WINDOWS = [
  { id: "08-10", label: "8:00 – 10:00 AM"  },
  { id: "10-12", label: "10:00 AM – 12 PM" },
  { id: "13-15", label: "1:00 – 3:00 PM"   },
  { id: "15-17", label: "3:00 – 5:00 PM"   },
];

// ── Date helpers ───────────────────────────────────────────────────────────────
function sod(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function isSameDay(a: Date, b: Date): boolean {
  return sod(a).getTime() === sod(b).getTime();
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((sod(b).getTime() - sod(a).getTime()) / 86400000);
}
function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
}
function fmtDateShort(d: Date): string {
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

// ── Placeholder availability (demo data) ──────────────────────────────────────
// Computed once at module load so the calendar is stable across renders
const DEMO_TODAY = sod(new Date());

// Weekends + 6 specific day-offsets from today are "already booked"
const BOOKED_OFFSETS = new Set([3, 8, 11, 17, 22, 25]);

function isDayUnavailable(d: Date): boolean {
  const s   = sod(d);
  if (s < DEMO_TODAY) return true;
  const dow = s.getDay();
  if (dow === 0 || dow === 6) return true; // weekends
  return BOOKED_OFFSETS.has(daysBetween(DEMO_TODAY, s));
}

// ── Shared legend ──────────────────────────────────────────────────────────────
function CalLegend({ items }: { items: { dot: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-stone-200 dark:border-[#2a2d3e]">
      {items.map(({ dot, label }) => (
        <div key={label} className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
          <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", dot)} />
          {label}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  SCHEDULE MODAL
// ══════════════════════════════════════════════════════════════════════════════
export interface ScheduleModalProps {
  open:         boolean;
  onClose:      () => void;
  listingTitle: string;
  listingPrice: number;
  priceUnit:    string;
}

export function ScheduleModal({
  open, onClose, listingTitle, listingPrice, priceUnit,
}: ScheduleModalProps) {
  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate,   setEndDate]   = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selectedWindow, setWindow] = useState<string | null>(null);
  const [message,   setMessage]   = useState("");
  const [sending,   setSending]   = useState(false);

  if (!open) return null;

  // ── Click logic ─────────────────────────────────────────────────────────────
  function handleSelectDay(d: Date) {
    const bothSet = startDate && endDate;
    if (!startDate || bothSet) {
      // First click — or reset after a complete range
      setStartDate(sod(d));
      setEndDate(null);
    } else {
      // Second click — ignore same day, otherwise complete the range
      if (isSameDay(d, startDate)) return;
      const a = sod(d).getTime();
      const b = sod(startDate).getTime();
      setStartDate(a < b ? sod(d) : sod(startDate));
      setEndDate(a < b   ? sod(startDate) : sod(d));
    }
  }

  function handleClear() {
    setStartDate(null);
    setEndDate(null);
    setHoverDate(null);
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  // ── Derived values ────────────────────────────────────────────────────────────
  const numNights = startDate && endDate ? daysBetween(startDate, endDate) : 0;

  // Estimate only when we can compute a daily rate
  const estimatedTotal = (() => {
    if (!startDate || !endDate || numNights <= 0) return null;
    const unit = priceUnit.toLowerCase();
    if (unit.includes("night") || unit.includes("day")) {
      return listingPrice * numNights;
    }
    if (unit.includes("week")) {
      return Math.round((listingPrice / 7) * numNights);
    }
    if (unit.includes("month")) {
      return Math.round((listingPrice / 30) * numNights);
    }
    return null; // fixed / negotiable — can't estimate
  })();

  // Prompt message for the inline step banner
  const stepMessage = (() => {
    if (!startDate)        return { phase: 1, text: "Select your check-in date" };
    if (!endDate)          return { phase: 2, text: `Check-in: ${fmtDateShort(startDate)} — Now select check-out` };
    return { phase: 3, text: "" };
  })();

  // ── Send ─────────────────────────────────────────────────────────────────────
  function handleSend() {
    if (!startDate || !endDate) {
      toast.error("Please select both a check-in and check-out date.", { position: "top-center" });
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      onClose();
      toast.success(
        `Schedule request sent for ${fmtDateShort(startDate)} – ${fmtDateShort(endDate)}! The seller will respond shortly.`,
        { position: "top-center", duration: 5000 },
      );
    }, 900);
  }

  const tealColors: BookingCalendarColors = {
    solid:     "bg-teal-600",
    rangeFill: "bg-teal-100 dark:bg-teal-900/25",
    ringToday: "ring-teal-500 dark:ring-teal-500",
    hoverBg:   "hover:bg-teal-50 dark:hover:bg-teal-950/30 hover:text-teal-700 dark:hover:text-teal-300",
  };

  const canSend = !!startDate && !!endDate && !sending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-[#1c1f2e] rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh]">

        {/* ── Header ── */}
        <div className="bg-[#1e2433] px-5 py-4 flex items-start justify-between shrink-0 rounded-t-3xl sm:rounded-t-2xl">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-teal-400 shrink-0" />
              <h2 className="text-white font-bold text-base">Request a Schedule</h2>
            </div>
            <p className="text-slate-400 text-sm truncate">{listingTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors ml-3 shrink-0 mt-0.5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 flex flex-col gap-5">

            {/* Calendar section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                  Select Dates
                </p>
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-[11px] text-stone-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    Clear selection
                  </button>
                )}
              </div>

              <div className="bg-stone-50 dark:bg-[#13151f] rounded-2xl p-4 border border-stone-200 dark:border-[#2a2d3e]">
                <BookingCalendar
                  viewYear={viewYear}
                  viewMonth={viewMonth}
                  onPrevMonth={prevMonth}
                  onNextMonth={nextMonth}
                  isUnavailable={isDayUnavailable}
                  startDate={startDate}
                  endDate={endDate}
                  hoverDate={hoverDate}
                  onSelect={handleSelectDay}
                  onHover={setHoverDate}
                  today={DEMO_TODAY}
                  colors={tealColors}
                />
                <CalLegend items={[
                  { dot: "bg-teal-600",                                    label: "Selected"    },
                  { dot: "bg-teal-200 dark:bg-teal-800",                   label: "Your range"  },
                  { dot: "bg-red-200 dark:bg-red-900",                     label: "Unavailable" },
                  { dot: "bg-stone-200 dark:bg-stone-700",                 label: "Past"        },
                ]} />
              </div>
            </div>

            {/* Time window picker */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                  Preferred Time Window <span className="text-red-400 text-[10px]">required</span>
                </p>
              </div>

              {/* Manual time inputs */}
              {/* Hides when there is specific time window provided */}
              <div className="flex items-center gap-2 mb-3">
                <Label htmlFor={"start-time"}>
                  Start time
                </Label>
                <div className='relative grow'>
                  <Input
                    id={"start-time"}
                    type='time'
                    step='1'
                    defaultValue='08:00:00'
                    className='peer appearance-none pl-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'
                  />
                  <div className='text-muted-foreground/80 pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 peer-disabled:opacity-50'>
                    <ClockIcon size={16} aria-hidden='true' />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Label htmlFor={"end-time"} className="pr-1">
                  End time
                </Label>
                <div className='relative grow'>
                  <Input
                    id={"end-time"}
                    type='time'
                    step='1'
                    defaultValue='17:00:00'
                    className='peer appearance-none pl-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'
                  />
                  <div className='text-muted-foreground/80 pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 peer-disabled:opacity-50'>
                    <ClockIcon size={16} aria-hidden='true' />
                  </div>
                </div>
              </div>

              {/* Display when time slots provided */}
              <div className="grid grid-cols-2 gap-2">
                {TIME_WINDOWS.map(tw => (
                  <button
                    key={tw.id}
                    type="button"
                    onClick={() => setWindow(prev => prev === tw.id ? null : tw.id)}
                    className={cn(
                      "px-3 py-3 rounded-xl border text-sm font-semibold text-center transition-all",
                      selectedWindow === tw.id
                        ? "bg-violet-700 border-violet-700 text-white shadow-sm"
                        : "bg-stone-50 dark:bg-[#13151f] border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/20 hover:text-violet-700 dark:hover:text-violet-300",
                    )}
                  >
                    {tw.label}
                  </button>
                ))}
              </div>

            </div>

            {/* Step / selection summary */}
            {stepMessage.phase < 3 ? (
              <div className="flex items-center gap-3 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-xl px-4 py-3">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
                  stepMessage.phase === 1
                    ? "bg-teal-600 text-white"
                    : "bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400",
                )}>
                  1
                </div>
                <div className="w-8 h-0.5 bg-teal-200 dark:bg-teal-800 shrink-0" />
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
                  stepMessage.phase === 2
                    ? "bg-teal-600 text-white"
                    : "bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400",
                )}>
                  2
                </div>
                <p className="text-sm text-teal-700 dark:text-teal-300 font-medium">
                  {stepMessage.text}
                </p>
              </div>
            ) : (
              /* Complete range summary card */
              startDate && endDate && (
                <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-xl px-4 py-3.5 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-teal-600 dark:text-teal-500 uppercase tracking-widest mb-1">
                        Check-in
                      </p>
                      <p className="text-sm font-bold text-stone-800 dark:text-stone-100">
                        {fmtDate(startDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-teal-600 dark:text-teal-500 uppercase tracking-widest mb-1">
                        Check-out
                      </p>
                      <p className="text-sm font-bold text-stone-800 dark:text-stone-100">
                        {fmtDate(endDate)}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-teal-200 dark:border-teal-800 pt-2 flex items-center justify-between">
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      {numNights} night{numNights !== 1 ? "s" : ""} ·{" "}
                      {phpFmt.format(listingPrice)} {priceUnit}
                    </span>
                    {estimatedTotal !== null && (
                      <span className="text-sm font-bold text-stone-900 dark:text-stone-50">
                        Est. {phpFmt.format(estimatedTotal)}
                      </span>
                    )}
                  </div>
                </div>
              )
            )}

            {/* Optional message */}
            <div>
              <label className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-2 block">
                Message{" "}
                <span className="font-normal normal-case tracking-normal text-stone-400 dark:text-stone-500">
                  (optional)
                </span>
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Enter any specific requests or questions for the seller here."
                className="w-full bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl px-3 py-2.5 text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 outline-none focus:border-teal-400 dark:focus:border-teal-600 resize-none transition-colors"
              />
            </div>

          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-5 pb-6 pt-3 flex gap-2.5 shrink-0 border-t border-stone-100 dark:border-[#252837]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-full border border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300 text-sm font-semibold hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="flex-1 py-3 rounded-full bg-teal-700 hover:bg-teal-600 text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? "Sending…" : "Send Request →"}
          </button>
        </div>
      </div>
    </div>
  );
}
