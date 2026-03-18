"use client";

import { useState } from "react";
import {
  ChevronLeft, ChevronRight, X, Package, CheckCircle,
  Clock, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Formatting ─────────────────────────────────────────────────────────────────
const phpFmt = new Intl.NumberFormat("en-PH", {
  style: "currency", currency: "PHP", minimumFractionDigits: 0,
});

// ── Constants ──────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

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
function getGridDays(year: number, month: number): Date[] {
  const first  = new Date(year, month, 1);
  const offset = first.getDay(); // 0 = Sunday
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - offset + i));
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

// Rent: weekends + 6 specific day-offsets from today are "already booked"
const RENT_BOOKED_OFFSETS = new Set([3, 8, 11, 17, 22, 25]);

function isRentUnavailable(d: Date): boolean {
  const s   = sod(d);
  if (s < DEMO_TODAY) return true;
  const dow = s.getDay();
  if (dow === 0 || dow === 6) return true; // weekends
  return RENT_BOOKED_OFFSETS.has(daysBetween(DEMO_TODAY, s));
}

// Service: Sundays + 5 specific day-offsets are "fully booked"
const SVC_BOOKED_OFFSETS = new Set([5, 12, 18, 25, 30]);

function isSvcUnavailable(d: Date): boolean {
  const s = sod(d);
  if (s < DEMO_TODAY) return true;
  if (s.getDay() === 0) return true; // Sundays
  return SVC_BOOKED_OFFSETS.has(daysBetween(DEMO_TODAY, s));
}

// ── Shared colour config type ──────────────────────────────────────────────────
interface CalColors {
  solid:     string; // selected day circle
  rangeFill: string; // in-range strip background
  ringToday: string; // today border ring
  hoverBg:   string; // available day hover
}

// ── Shared calendar component ──────────────────────────────────────────────────
interface BookingCalendarProps {
  viewYear:      number;
  viewMonth:     number;
  onPrevMonth:   () => void;
  onNextMonth:   () => void;
  isUnavailable: (d: Date) => boolean;
  startDate:     Date | null;
  endDate:       Date | null;       // null → single-select mode (service)
  hoverDate:     Date | null;       // for range-preview on hover (rent only)
  onSelect:      (d: Date) => void;
  onHover:       (d: Date | null) => void;
  singleSelect?: boolean;
  colors:        CalColors;
}

function BookingCalendar({
  viewYear, viewMonth, onPrevMonth, onNextMonth,
  isUnavailable, startDate, endDate, hoverDate,
  onSelect, onHover, singleSelect = false, colors,
}: BookingCalendarProps) {
  const cells = getGridDays(viewYear, viewMonth);

  // While user has startDate but no endDate, show preview from hoverDate
  const previewEnd = singleSelect ? null : (endDate ?? hoverDate);

  // Normalise range so lo ≤ hi regardless of click order
  let lo: Date | null = null;
  let hi: Date | null = null;
  if (startDate && previewEnd) {
    const a = sod(startDate).getTime();
    const b = sod(previewEnd).getTime();
    lo = a <= b ? sod(startDate) : sod(previewEnd);
    hi = a <= b ? sod(previewEnd) : sod(startDate);
  }

  return (
    <div className="select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={onPrevMonth}
          className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 dark:text-stone-500 hover:bg-stone-200 dark:hover:bg-[#252837] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-stone-900 dark:text-stone-50">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={onNextMonth}
          className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 dark:text-stone-500 hover:bg-stone-200 dark:hover:bg-[#252837] transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(l => (
          <div
            key={l}
            className="text-center text-[10px] font-bold text-stone-400 dark:text-stone-600 pb-1"
          >
            {l}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          // Cells outside the current month are invisible spacers
          if (d.getMonth() !== viewMonth) {
            return <div key={i} className="h-9" />;
          }

          const ds       = sod(d);
          const unavail  = isUnavailable(d);
          const isPast   = ds < DEMO_TODAY;
          const isToday  = isSameDay(d, new Date());
          const isStart  = startDate ? isSameDay(d, startDate) : false;
          const isEnd    = endDate   ? isSameDay(d, endDate)   : false;
          const isSelected = isStart || isEnd;

          // Range membership
          const dt      = ds.getTime();
          const inRange = !singleSelect && lo && hi
            ? dt > lo.getTime() && dt < hi.getTime()
            : false;

          // Range edge — only show strip when start ≠ end
          const hasRange    = lo && hi && lo.getTime() !== hi.getTime();
          const isRangeStart = hasRange && lo && isSameDay(d, lo);
          const isRangeEnd   = hasRange && hi && isSameDay(d, hi);

          const disabled = unavail || isPast;

          return (
            <div key={i} className="relative h-9 flex items-center justify-center">
              {/* Range background strip — sits behind the button */}
              {(inRange || isRangeStart || isRangeEnd) && (
                <div
                  className={cn(
                    "absolute inset-y-1 pointer-events-none",
                    colors.rangeFill,
                    isRangeStart ? "left-1/2 right-0" :
                    isRangeEnd   ? "left-0 right-1/2" :
                                   "left-0 right-0",
                  )}
                />
              )}

              <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onSelect(d)}
                onMouseEnter={() => !disabled && onHover(d)}
                onMouseLeave={() => onHover(null)}
                className={cn(
                  "relative z-10 w-8 h-8 rounded-full flex items-center justify-center",
                  "text-xs font-medium transition-all duration-100",
                  // Past dates
                  isPast && "text-stone-300 dark:text-stone-700 cursor-not-allowed",
                  // Unavailable (but not past) — strikethrough red
                  unavail && !isPast && [
                    "text-red-300 dark:text-red-900/60",
                    "line-through cursor-not-allowed",
                  ],
                  // Available, not selected
                  !disabled && !isSelected && [
                    "text-stone-700 dark:text-stone-200 cursor-pointer",
                    colors.hoverBg,
                  ],
                  // Selected
                  isSelected && ["font-bold text-white", colors.solid],
                  // Today ring (only when not selected)
                  isToday && !isSelected && [
                    "ring-2 ring-offset-1",
                    colors.ringToday,
                    "ring-offset-stone-50 dark:ring-offset-[#13151f]",
                  ],
                )}
              >
                {d.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Shared legend ──────────────────────────────────────────────────────────────
function CalLegend({ items }: { items: { dot: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-stone-200 dark:border-[#2a2d3e]">
      {items.map(({ dot, label }) => (
        <div key={label} className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
          <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", dot)} />
          {label}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  REQUEST TO RENT MODAL
// ══════════════════════════════════════════════════════════════════════════════
export interface RequestToRentModalProps {
  open:         boolean;
  onClose:      () => void;
  listingTitle: string;
  listingPrice: number;
  priceUnit:    string;
}

export function RequestToRentModal({
  open, onClose, listingTitle, listingPrice, priceUnit,
}: RequestToRentModalProps) {
  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate,   setEndDate]   = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
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
        `Rental request sent for ${fmtDateShort(startDate)} – ${fmtDateShort(endDate)}! The seller will respond shortly.`,
        { position: "top-center", duration: 5000 },
      );
    }, 900);
  }

  const tealColors: CalColors = {
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
        <div className="bg-[#1e2433] px-5 py-4 flex items-start justify-between flex-shrink-0 rounded-t-3xl sm:rounded-t-2xl">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <h2 className="text-white font-bold text-base">Request to Rent</h2>
            </div>
            <p className="text-slate-400 text-xs truncate">{listingTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors ml-3 flex-shrink-0 mt-0.5"
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
                  isUnavailable={isRentUnavailable}
                  startDate={startDate}
                  endDate={endDate}
                  hoverDate={hoverDate}
                  onSelect={handleSelectDay}
                  onHover={setHoverDate}
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

            {/* Step / selection summary */}
            {stepMessage.phase < 3 ? (
              <div className="flex items-center gap-3 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-xl px-4 py-3">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0",
                  stepMessage.phase === 1
                    ? "bg-teal-600 text-white"
                    : "bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400",
                )}>
                  1
                </div>
                <div className="w-8 h-0.5 bg-teal-200 dark:bg-teal-800 flex-shrink-0" />
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0",
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
                placeholder="e.g. We're a family of 3 looking for a quiet weekend stay. Is early check-in possible?"
                className="w-full bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl px-3 py-2.5 text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 outline-none focus:border-teal-400 dark:focus:border-teal-600 resize-none transition-colors"
              />
            </div>

          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-5 pb-6 pt-3 flex gap-2.5 flex-shrink-0 border-t border-stone-100 dark:border-[#252837]">
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

// ══════════════════════════════════════════════════════════════════════════════
//  BOOK SERVICE MODAL
// ══════════════════════════════════════════════════════════════════════════════
export interface BookServiceModalProps {
  open:         boolean;
  onClose:      () => void;
  listingTitle: string;
  listingPrice: number;
  priceUnit:    string;
}

export function BookServiceModal({
  open, onClose, listingTitle, listingPrice, priceUnit,
}: BookServiceModalProps) {
  const now = new Date();
  const [viewYear,       setViewYear]      = useState(now.getFullYear());
  const [viewMonth,      setViewMonth]     = useState(now.getMonth());
  const [selectedDate,   setSelectedDate]  = useState<Date | null>(null);
  const [selectedWindow, setWindow]        = useState<string | null>(null);
  const [message,        setMessage]       = useState("");
  const [sending,        setSending]       = useState(false);

  if (!open) return null;

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function handleSend() {
    if (!selectedDate) {
      toast.error("Please select a date for the service.", { position: "top-center" });
      return;
    }
    if (!selectedWindow) {
      toast.error("Please choose a preferred time window.", { position: "top-center" });
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      onClose();
      const tw = TIME_WINDOWS.find(w => w.id === selectedWindow);
      toast.success(
        `Booking requested for ${fmtDate(selectedDate)} at ${tw?.label}. The service provider will confirm your appointment.`,
        { position: "top-center", duration: 5000 },
      );
    }, 900);
  }

  const violetColors: CalColors = {
    solid:     "bg-violet-600",
    rangeFill: "bg-violet-100 dark:bg-violet-900/25", // unused in single-select mode
    ringToday: "ring-violet-500 dark:ring-violet-500",
    hoverBg:   "hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:text-violet-700 dark:hover:text-violet-300",
  };

  const canSend = !!selectedDate && !!selectedWindow && !sending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-[#1c1f2e] rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh]">

        {/* ── Header ── */}
        <div className="bg-[#1e2433] px-5 py-4 flex items-start justify-between flex-shrink-0 rounded-t-3xl sm:rounded-t-2xl">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-violet-400 flex-shrink-0" />
              <h2 className="text-white font-bold text-base">Book Service</h2>
            </div>
            <p className="text-slate-400 text-xs truncate">{listingTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors ml-3 flex-shrink-0 mt-0.5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 flex flex-col gap-5">

            {/* Calendar section */}
            <div>
              <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-3">
                Select a Date
              </p>

              <div className="bg-stone-50 dark:bg-[#13151f] rounded-2xl p-4 border border-stone-200 dark:border-[#2a2d3e]">
                <BookingCalendar
                  viewYear={viewYear}
                  viewMonth={viewMonth}
                  onPrevMonth={prevMonth}
                  onNextMonth={nextMonth}
                  isUnavailable={isSvcUnavailable}
                  startDate={selectedDate}
                  endDate={null}
                  hoverDate={null}
                  onSelect={d => setSelectedDate(isSameDay(d, selectedDate ?? new Date(0)) ? null : d)}
                  onHover={() => {}}
                  singleSelect
                  colors={violetColors}
                />
                <CalLegend items={[
                  { dot: "bg-violet-600",                  label: "Selected"      },
                  { dot: "bg-green-200 dark:bg-green-900", label: "Available"     },
                  { dot: "bg-red-200 dark:bg-red-900",     label: "Fully booked"  },
                  { dot: "bg-stone-200 dark:bg-stone-700", label: "Past"          },
                ]} />
              </div>
            </div>

            {/* Selected date chip */}
            {selectedDate ? (
              <div className="flex items-center justify-between bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2.5 text-violet-700 dark:text-violet-300">
                  <CalendarDays className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-bold">{fmtDate(selectedDate)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="text-violet-400 hover:text-violet-600 dark:hover:text-violet-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 border border-dashed border-violet-200 dark:border-violet-800 rounded-xl px-4 py-3 text-stone-400 dark:text-stone-500">
                <CalendarDays className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">No date selected yet — pick one on the calendar above.</span>
              </div>
            )}

            {/* Time window picker */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                  Preferred Time Window <span className="text-red-400 text-[10px]">required</span>
                </p>
              </div>

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
              <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-2 leading-relaxed">
                The provider will confirm the exact time within your preferred window.
              </p>
            </div>

            {/* Pricing info */}
            <div className="flex items-center justify-between bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl px-4 py-3">
              <span className="text-xs text-stone-500 dark:text-stone-400">Service rate</span>
              <span className="text-sm font-bold text-stone-900 dark:text-stone-50">
                {phpFmt.format(listingPrice)}
                {priceUnit && (
                  <span className="text-xs font-normal text-stone-400 dark:text-stone-500"> {priceUnit}</span>
                )}
              </span>
            </div>

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
                placeholder="e.g. I have 2 split-type aircon units in the living room and bedroom. Is parking available near the area?"
                className="w-full bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl px-3 py-2.5 text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 outline-none focus:border-violet-400 dark:focus:border-violet-600 resize-none transition-colors"
              />
            </div>

          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-5 pb-6 pt-3 flex gap-2.5 flex-shrink-0 border-t border-stone-100 dark:border-[#252837]">
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
            className="flex-1 py-3 rounded-full bg-violet-700 hover:bg-violet-600 text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? "Booking…" : "Confirm Booking →"}
          </button>
        </div>
      </div>
    </div>
  );
}
