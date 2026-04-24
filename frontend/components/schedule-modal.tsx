"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Package, Clock, ClockIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  isDayUnavailableByDaysOff,
  normalizeDaysOff,
  parseDateOnly,
} from "@/utils/scheduleAvailability";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { ModalFormCard } from "./modal-form-card";
import { BookingCalendar, type BookingCalendarColors } from "./ui/booking-calendar";
import { formatPrice } from "@/utils/string-builder";
import { ListingType } from "@/types/listings";
import { MESSAGE_MAX_LENGTH, limitMessageInputLength } from "@/utils/validation";

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

function parseTimeToMinutes(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(":");
  if (parts.length < 2) return null;

  const hour = Number.parseInt(parts[0], 10);
  const minute = Number.parseInt(parts[1], 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return hour * 60 + minute;
}

function normalizeTimeForInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const parts = trimmed.split(":");
  if (parts.length < 2) return "";

  const hour = Number.parseInt(parts[0], 10);
  const minute = Number.parseInt(parts[1], 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "";
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatTimeLabel(value: string): string {
  const time = normalizeTimeForInput(value);
  if (!time) return value;
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number.parseInt(hourRaw, 10);
  const minute = Number.parseInt(minuteRaw, 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;

  const period = hour >= 12 ? "PM" : "AM";
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function getInitialViewDate(today: Date, availableFromDate: Date | null): Date {
  if (!availableFromDate) return today;
  return availableFromDate.getTime() > today.getTime() ? availableFromDate : today;
}

interface ResolvedTimeWindow {
  id: string;
  label: string;
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
  onSubmit?:    (payload: {
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    message: string;
  }) => Promise<void> | void;
  listingTitle: string;
  listingPrice: number;
  priceUnit:    string;
  availableFrom?: string;
  daysOff?: string[] | string;
  timeWindows?: { startTime: string; endTime: string }[];
  initialStartAt?: string;
  initialEndAt?: string;
  submitLabel?: string;
  type: ListingType | string;
}

export function ScheduleModal({
  open,
  onClose,
  onSubmit,
  listingTitle,
  listingPrice,
  priceUnit,
  availableFrom,
  daysOff = [],
  timeWindows = [],
  initialStartAt,
  initialEndAt,
  submitLabel = "Request Schedule",
  type
}: ScheduleModalProps) {
  const today = useMemo(() => sod(new Date()), []);
  const availableFromDate = useMemo(() => parseDateOnly(availableFrom), [availableFrom]);

  const dayOffRules = useMemo(() => normalizeDaysOff(daysOff), [daysOff]);

  const resolvedTimeWindows = useMemo<ResolvedTimeWindow[]>(() => {
    const unique = new Set<string>();
    const list: ResolvedTimeWindow[] = [];

    for (const window of timeWindows) {
      const start = normalizeTimeForInput(window.startTime ?? "");
      const end = normalizeTimeForInput(window.endTime ?? "");
      if (!start || !end) continue;

      const startMinutes = parseTimeToMinutes(start);
      const endMinutes = parseTimeToMinutes(end);
      if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) continue;

      const id = `${start}-${end}`;
      if (unique.has(id)) continue;
      unique.add(id);

      list.push({
        id,
        label: `${formatTimeLabel(start)} - ${formatTimeLabel(end)}`,
      });
    }

    return list;
  }, [timeWindows]);

  const initialViewDate = getInitialViewDate(today, availableFromDate);
  const [viewYear,  setViewYear]  = useState(initialViewDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialViewDate.getMonth());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate,   setEndDate]   = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selectedWindow, setWindow] = useState<string | null>(null);
  const [manualStartTime, setManualStartTime] = useState("08:00");
  const [manualEndTime, setManualEndTime] = useState("17:00");
  const [message,   setMessage]   = useState("");
  const [sending,   setSending]   = useState(false);

  const hasPresetTimeWindows = resolvedTimeWindows.length > 0;

  const initialStartDateTime = useMemo(() => {
    const value = String(initialStartAt ?? "").trim();
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }, [initialStartAt]);

  const initialEndDateTime = useMemo(() => {
    const value = String(initialEndAt ?? "").trim();
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }, [initialEndAt]);

  const manualStartMinutes = parseTimeToMinutes(manualStartTime);
  const manualEndMinutes = parseTimeToMinutes(manualEndTime);
  const manualTimeRangeValid =
    manualStartMinutes !== null &&
    manualEndMinutes !== null &&
    manualStartMinutes < manualEndMinutes;

  useEffect(() => {
    if (!open) return;

    const prefStartDate = initialStartDateTime ? sod(initialStartDateTime) : null;
    const prefEndDate = initialEndDateTime ? sod(initialEndDateTime) : null;
    const nextViewDate = getInitialViewDate(today, prefStartDate ?? availableFromDate);
    setViewYear(nextViewDate.getFullYear());
    setViewMonth(nextViewDate.getMonth());
    setStartDate(prefStartDate);
    setEndDate(prefEndDate);
    setHoverDate(null);

    const prefStartTime = initialStartDateTime
      ? `${String(initialStartDateTime.getHours()).padStart(2, "0")}:${String(initialStartDateTime.getMinutes()).padStart(2, "0")}`
      : "08:00";
    const prefEndTime = initialEndDateTime
      ? `${String(initialEndDateTime.getHours()).padStart(2, "0")}:${String(initialEndDateTime.getMinutes()).padStart(2, "0")}`
      : "17:00";

    setManualStartTime(prefStartTime);
    setManualEndTime(prefEndTime);

    const maybeWindowId = `${prefStartTime}-${prefEndTime}`;
    if (resolvedTimeWindows.some((window) => window.id === maybeWindowId)) {
      setWindow(maybeWindowId);
    } else {
      setWindow(null);
    }
  }, [open, today, availableFromDate, initialStartDateTime, initialEndDateTime, resolvedTimeWindows]);

  function isDayUnavailable(d: Date): boolean {
    return isDayUnavailableByDaysOff(d, dayOffRules, {
      minDate: availableFromDate,
      includePast: false,
    });
  }

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
  function toIsoDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function resolveTimeRange(): { startTime: string; endTime: string } | null {
    if (hasPresetTimeWindows) {
      if (!selectedWindow) return null;
      const [start, end] = selectedWindow.split("-");
      if (!start || !end) return null;
      return { startTime: start, endTime: end };
    }

    if (!manualTimeRangeValid) return null;
    return {
      startTime: manualStartTime,
      endTime: manualEndTime,
    };
  }

  async function handleSend() {
    if (!startDate || !endDate) {
      toast.error("Please select both a check-in and check-out date.", { position: "top-center" });
      return;
    }

    if (hasPresetTimeWindows) {
      if (!selectedWindow) {
        toast.error("Please select one available time window.", { position: "top-center" });
        return;
      }
    } else if (!manualTimeRangeValid) {
      toast.error("Please enter a valid start and end time.", { position: "top-center" });
      return;
    }

    const resolvedRange = resolveTimeRange();
    if (!resolvedRange) {
      toast.error("Please select a valid schedule time range.", { position: "top-center" });
      return;
    }

    setSending(true);
    try {
      if (onSubmit) {
        await onSubmit({
          startDate: toIsoDateString(startDate),
          endDate: toIsoDateString(endDate),
          startTime: resolvedRange.startTime,
          endTime: resolvedRange.endTime,
          message: message.trim(),
        });
      } else {
        toast.success(
          `Schedule request sent for ${fmtDateShort(startDate)} - ${fmtDateShort(endDate)}! The seller will respond shortly.`,
          { position: "top-center", duration: 5000 },
        );
      }
      onClose();
    } finally {
      setSending(false);
    }
  }

  const tealColors: BookingCalendarColors = {
    solid:     "bg-teal-600",
    rangeFill: "bg-teal-100 dark:bg-teal-900/25",
    ringToday: "ring-teal-500 dark:ring-teal-500",
    hoverBg:   "hover:bg-teal-50 dark:hover:bg-teal-950/30 hover:text-teal-700 dark:hover:text-teal-300",
  };

  const hasTimeSelection = hasPresetTimeWindows ? !!selectedWindow : manualTimeRangeValid;
  const canSend = !!startDate && !!endDate && hasTimeSelection && !sending;

  const selectedWindowLabel =
    resolvedTimeWindows.find((window) => window.id === selectedWindow)?.label ?? "";

  const manualTimeLabel =
    manualTimeRangeValid ? `${formatTimeLabel(manualStartTime)} - ${formatTimeLabel(manualEndTime)}` : "";

  return (
    <ModalFormCard
      icon={Package}
      type={type}
      title="Request a Schedule"
      subTitle={listingTitle}
      onClose={onClose}
      handleSend={handleSend}
      canSend={canSend}
      sending={sending}
      submitLabel={submitLabel}
    >
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
              className="text-xs text-stone-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              Clear selection
            </button>
          )}
        </div>

        <div className="bg-stone-50 dark:bg-[#13151f] rounded-lg p-4 border border-stone-200 dark:border-[#2a2d3e]">
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
            today={today}
            colors={tealColors}
          />
          <CalLegend items={[
            { dot: "bg-teal-600",                                    label: "Selected"    },
            { dot: "bg-teal-200 dark:bg-teal-800",                   label: "Your range"  },
            { dot: "bg-red-200 dark:bg-red-900",                     label: "Days off"    },
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

        {hasPresetTimeWindows ? (
          <>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
              Select from the provider&apos;s available time windows.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {resolvedTimeWindows.map((tw) => (
                <button
                  key={tw.id}
                  type="button"
                  onClick={() => setWindow((prev) => (prev === tw.id ? null : tw.id))}
                  className={cn(
                    "px-3 py-3 rounded-lg border text-sm font-semibold text-center transition-all",
                    selectedWindow === tw.id
                      ? "bg-violet-700 border-violet-700 text-white shadow-sm"
                      : "bg-stone-50 dark:bg-[#13151f] border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/20 hover:text-violet-700 dark:hover:text-violet-300",
                  )}
                >
                  {tw.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
              No fixed time windows are set for this listing. Choose your preferred time range.
            </p>
            <div className="flex items-center gap-2 mb-3">
              <Label htmlFor={"start-time"}>
                Start time
              </Label>
              <div className="relative grow">
                <Input
                  id={"start-time"}
                  type="time"
                  value={manualStartTime}
                  onChange={(e) => setManualStartTime(e.target.value)}
                  className="peer appearance-none pl-9 text-sm [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
                <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 peer-disabled:opacity-50">
                  <ClockIcon size={16} aria-hidden="true" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <Label htmlFor={"end-time"} className="pr-1">
                End time
              </Label>
              <div className="relative grow">
                <Input
                  id={"end-time"}
                  type="time"
                  value={manualEndTime}
                  onChange={(e) => setManualEndTime(e.target.value)}
                  className="peer appearance-none pl-9 text-sm [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
                <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 peer-disabled:opacity-50">
                  <ClockIcon size={16} aria-hidden="true" />
                </div>
              </div>
            </div>

            {!manualTimeRangeValid && (
              <p className="text-xs text-red-500 mt-2">End time must be later than start time.</p>
            )}
          </>
        )}

      </div>

      {/* Step / selection summary */}
      {stepMessage.phase < 3 ? (
        <div className="flex items-center gap-3 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-lg px-4 py-3">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
            stepMessage.phase === 1
              ? "bg-teal-600 text-white"
              : "bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400",
          )}>
            1
          </div>
          <div className="w-8 h-0.5 bg-teal-200 dark:bg-teal-800 shrink-0" />
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
            stepMessage.phase === 2
              ? "bg-teal-600 text-white"
              : "bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400",
          )}>
            2
          </div>
          <p className="text-xs text-teal-700 dark:text-teal-300 font-medium">
            {stepMessage.text}
          </p>
        </div>
      ) : (
        /* Complete range summary card */
        startDate && endDate && (
          <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-lg px-4 py-3.5 flex flex-col gap-2">
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
                {formatPrice(listingPrice)} {priceUnit}
              </span>
              {estimatedTotal !== null && (
                <span className="text-sm font-bold text-stone-900 dark:text-stone-50">
                  Est. {formatPrice(estimatedTotal)}
                </span>
              )}
            </div>
            {(selectedWindowLabel || manualTimeLabel) && (
              <div className="border-t border-teal-200 dark:border-teal-800 pt-2">
                <p className="text-xs text-stone-500 dark:text-stone-400">Preferred time</p>
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                  {selectedWindowLabel || manualTimeLabel}
                </p>
              </div>
            )}
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
        <Textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(limitMessageInputLength(e.target.value))}
          maxLength={MESSAGE_MAX_LENGTH}
          placeholder="Enter any specific requests or questions for the seller here."
          className="w-full max-h-24 bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-lg px-3 py-2.5 text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 outline-none focus:border-teal-400 dark:focus:border-teal-600 resize-none transition-colors"
        />
      </div>
    </ModalFormCard>
  );
}
