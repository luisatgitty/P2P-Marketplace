"use client";

import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus, X, ChevronRight, ChevronLeft, AlertCircle,
  CheckCircle2, Loader2, Info, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/utils/UserContext";
import {
  getBarangaysByCity,
  getCitiesByProvince,
  getProvinces,
  type LocationOption,
} from "@/services/locationService";
import { BookingCalendar, type BookingCalendarColors } from "./ui/booking-calendar";

// ─── Types ─────────────────────────────────────────────────────────────────────
export type FormType = "sell" | "rent" | "service";

export interface ListingFormData {
  // Common
  title:        string;
  category:     string;
  price:        string;
  priceUnit:    string;
  description:  string;
  highlights:   string[];   // → extra.features on detail page (max 8)
  locationCity: string;
  locationProv: string;
  locationBrgy: string;
  images:       File[];
  // Sell
  condition:      string;
  deliveryMethod: string;
  // Rent
  minPeriod:    string;
  availability: string;
  deposit:      string;
  dayoffs:      string[];
  amenities:    string[];
  // Service
  turnaround:   string;
  serviceArea:  string;
  arrangement:  string;
  inclusions:   string[];
}

export interface SellFormData {
  title:        string;
  category:     string;
  price:        string;
  priceUnit:    string;
  description:  string;
  inclusions:   string[];
  highlights:   string[];
  locationCity: string;
  locationProv: string;
  locationBrgy: string;
  images:       File[];
  // Sell-specific
  condition:      string;
  deliveryMethod: string;
}

export interface RentFormData {
  title:        string;
  category:     string;
  price:        string;
  priceUnit:    string;
  description:  string;
  inclusions:   string[];
  highlights:   string[];
  locationCity: string;
  locationProv: string;
  locationBrgy: string;
  images:       File[];
  // Rent-specific
  minPeriod:    string;
  availability: string;
  deposit:      string;
  deliveryMethod: string;
}

export interface ServiceFormData {
  title:        string;
  category:     string;
  price:        string;
  priceUnit:    string;
  description:  string;
  inclusions:   string[];
  highlights:   string[];
  locationCity: string;
  locationProv: string;
  locationBrgy: string;
  images:       File[];
  // Service-specific
  turnaround:   string;
  serviceArea:  string;
  arrangement:  string;
}

// ─── Per-type config ────────────────────────────────────────────────────────────
export const FORM_CONFIG = {
  sell: {
    label:        "Sell an Item",
    accentCls:    "text-stone-700 dark:text-stone-300",
    accentBg:     "bg-stone-100 dark:bg-stone-800/60",
    accentBorder: "border-stone-800 dark:border-stone-300",
    activeBg:     "bg-stone-900 dark:bg-stone-100",
    activeTxt:    "text-white dark:text-stone-900",
    btnCls:       "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:opacity-90",
    badgeDot:     "bg-stone-800 dark:bg-stone-200",
    steps:        ["Basic Info", "Item Details", "Location & Photos"] as const,
  },
  rent: {
    label:        "Rent Out",
    accentCls:    "text-teal-700 dark:text-teal-400",
    accentBg:     "bg-teal-50 dark:bg-teal-950/40",
    accentBorder: "border-teal-600 dark:border-teal-500",
    activeBg:     "bg-teal-700",
    activeTxt:    "text-white",
    btnCls:       "bg-teal-700 hover:bg-teal-600 text-white",
    badgeDot:     "bg-teal-600",
    steps:        ["Basic Info", "Rental Terms", "Location & Photos"] as const,
  },
  service: {
    label:        "Offer a Service",
    accentCls:    "text-violet-700 dark:text-violet-400",
    accentBg:     "bg-violet-50 dark:bg-violet-950/40",
    accentBorder: "border-violet-600 dark:border-violet-500",
    activeBg:     "bg-violet-700",
    activeTxt:    "text-white",
    btnCls:       "bg-violet-700 hover:bg-violet-600 text-white",
    badgeDot:     "bg-violet-600",
    steps:        ["Basic Info", "Service Details", "Location & Photos"] as const,
  },
} as const;

// ─── Field data ─────────────────────────────────────────────────────────────────
const CATEGORIES: Record<FormType, string[]> = {
  sell: [
    "Electronics", "Clothing & Shoes", "Vehicles", "Furniture & Home",
    "Sports & Outdoors", "Books & Media", "Hobbies & Collectibles",
    "Health & Beauty", "Food & Grocery", "Others",
  ],
  rent: [
    "Rooms & Bedspace", "Studio Units", "Apartments", "Houses",
    "Commercial Spaces", "Event Venues", "Vehicles", "Equipment & Tools", "Others",
  ],
  service: [
    "Home Repair & Cleaning", "IT & Tech", "Tutoring & Lessons",
    "Photography & Video", "Catering & Food", "Beauty & Wellness",
    "Transportation", "Events & Entertainment", "Creative & Design", "Others",
  ],
};

const PRICE_UNITS: Record<FormType, string[]> = {
  sell:    ["Fixed Price", "Negotiable"],
  rent:    ["/ month", "/ week", "/ day", "/ night", "/ hour"],
  service: ["/ hour", "/ project", "/ session", "/ unit", "/ day", "/ package"],
};

// Mirrors CONDITION_COLORS keys from the detail page
// ('NEW', 'LIKE_NEW', 'LIGHTLY_USED', 'WELL_USED', 'HEAVILY_USED');
const CONDITIONS = [
  { value: "New",           hint: "Unused, still in original packaging" },
  { value: "Like New",      hint: "Used briefly, no visible defects"    },
  { value: "Lightly Used",  hint: "Normal wear, fully functional"       },
  { value: "Well Used",     hint: "Noticeable wear, still works fine"   },
  { value: "Heavily Used",  hint: "Significant wear, may have defects"  },
];

const DELIVERY_OPTIONS = [
  { value: "Meet-up only",        desc: "Buyer and seller meet in person"        },
  { value: "Delivery available",  desc: "Seller can arrange shipping / courier"  },
  { value: "Meet-up or Delivery", desc: "Either option works — buyer's choice"   },
];

const DAYOFF = [ "Holiday", "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const MAX_HIGHLIGHTS = 8;
const MAX_AMENITIES = 16;

const PH_REGULAR_HOLIDAY_CACHE = new Map<number, Set<string>>();

function sod(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseISODate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parts = trimmed.split("-");
  if (parts.length !== 3) return null;

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed;
}

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fmtDateShort(d: Date): string {
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function shiftDays(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

function getLastMondayOfAugust(year: number): Date {
  const lastDay = new Date(year, 7, 31);
  const diff = (lastDay.getDay() - 1 + 7) % 7;
  return new Date(year, 7, 31 - diff);
}

function getPhilippineRegularHolidaySet(year: number): Set<string> {
  const cached = PH_REGULAR_HOLIDAY_CACHE.get(year);
  if (cached) return cached;

  const set = new Set<string>();
  const fixed = ["01-01", "04-09", "05-01", "06-12", "11-30", "12-25", "12-30"];
  for (const monthDay of fixed) {
    set.add(`${year}-${monthDay}`);
  }

  const easterSunday = getEasterSunday(year);
  set.add(toISODate(shiftDays(easterSunday, -3))); // Maundy Thursday
  set.add(toISODate(shiftDays(easterSunday, -2))); // Good Friday
  set.add(toISODate(getLastMondayOfAugust(year))); // National Heroes Day

  PH_REGULAR_HOLIDAY_CACHE.set(year, set);
  return set;
}

function toTwelveHour(time24: string): string {
  const [hourStr = "0", minStr = "00"] = time24.split(":");
  const hour = Number(hourStr);
  const minute = Number(minStr);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return time24;

  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function isDayUnavailableBySelection(d: Date, dayOff: string[]): boolean {
  const day = sod(d);
  if (day.getTime() < sod(new Date()).getTime()) return true;

  const weekday = day.toLocaleDateString("en-US", { weekday: "long" });
  if (dayOff.includes(weekday)) return true;

  if (dayOff.includes("Holiday")) {
    const holidaySet = getPhilippineRegularHolidaySet(day.getFullYear());
    if (holidaySet.has(toISODate(day))) return true;
  }

  return false;
}

interface TimeWindowRange {
  id: string;
  start: string;
  end: string;
}

type UploadImagePayload = {
  name: string;
  mimeType: string;
  data: string;
};

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to encode image."));
        return;
      }
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Failed to encode image."));
    reader.readAsDataURL(blob);
  });
}

async function compressImage(file: File): Promise<UploadImagePayload> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Invalid image file."));
      img.src = objectUrl;
    });

    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to process image.");
    }
    context.drawImage(image, 0, 0, width, height);

    const compressedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/webp", 0.78);
    });

    const finalBlob = compressedBlob ?? file;
    const mimeType = compressedBlob ? "image/webp" : file.type;
    const data = await blobToBase64(finalBlob);
    const baseName = file.name.replace(/\.[^/.]+$/, "");

    return {
      name: compressedBlob ? `${baseName}.webp` : file.name,
      mimeType,
      data,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// ─── Shared UI atoms ────────────────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-2 uppercase tracking-widest">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-stone-400 dark:text-stone-500 mt-2 leading-relaxed">
      <Info size={10} className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}

function ErrMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-500 mt-1.5">
      <AlertCircle size={10} className="shrink-0" /> {msg}
    </p>
  );
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> }) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={cn(
        "w-full rounded-xl border border-stone-200 dark:border-[#2a2d3e]",
        "bg-white dark:bg-[#13151f] text-stone-800 dark:text-stone-100 text-sm",
        "px-3.5 py-2.5 outline-none transition-colors",
        "focus:border-stone-400 dark:focus:border-stone-500",
        "placeholder:text-stone-400 dark:placeholder:text-stone-600",
        "disabled:opacity-50",
        className
      )}
    />
  );
}

function StyledSelect({
  value, onChange, children, className, ...props
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange" | "children" | "className">) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...props}
      className={cn(
        "w-full rounded-xl border border-stone-200 dark:border-[#2a2d3e]",
        "bg-white dark:bg-[#13151f] text-stone-800 dark:text-stone-100 text-sm",
        "px-3.5 py-2.5 outline-none appearance-none transition-colors",
        "focus:border-stone-400 dark:focus:border-stone-500",
        className
      )}
    >
      {children}
    </select>
  );
}

function StyledTextarea({
  value, onChange, placeholder, rows = 5,
}: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={cn(
        "w-full rounded-xl border border-stone-200 dark:border-[#2a2d3e]",
        "bg-white dark:bg-[#13151f] text-stone-800 dark:text-stone-100 text-sm",
        "px-3.5 py-2.5 resize-y outline-none transition-colors",
        "focus:border-stone-400 dark:focus:border-stone-500",
        "placeholder:text-stone-400 dark:placeholder:text-stone-600"
      )}
    />
  );
}

// ─── Section card ────────────────────────────────────────────────────────────────
function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm p-5 sm:p-6 flex flex-col gap-5">
      {title && (
        <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300 pb-2.5 border-b border-stone-100 dark:border-[#2a2d3e]">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

// ─── Radio option row (condition / delivery) ─────────────────────────────────────
function RadioOption({
  selected, onClick, label, hint, cfg,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  hint: string;
  cfg: typeof FORM_CONFIG[FormType];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full rounded-xl border-2 px-4 py-3 text-left transition-all",
        selected
          ? `${cfg.accentBorder} ${cfg.accentBg}`
          : "border-stone-200 dark:border-[#2a2d3e] hover:border-stone-300 dark:hover:border-stone-600"
      )}
    >
      {/* Radio dot */}
      <div className={cn(
        "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
        selected ? `${cfg.accentBorder} ${cfg.activeBg}` : "border-stone-300 dark:border-stone-600"
      )}>
        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-stone-900" />}
      </div>
      <div className="min-w-0">
        <p className={cn("text-sm font-semibold", selected ? cfg.accentCls : "text-stone-700 dark:text-stone-200")}>
          {label}
        </p>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{hint}</p>
      </div>
    </button>
  );
}

// ─── Highlights tag input ─────────────────────────────────────────────────────────
// These map directly to extra.features[] on the detail page, rendered as a
// 2-col grid with CheckCircle icons under the "Highlights" heading.
function HighlightsInput({
  highlights, setHighlights, cfg,
}: {
  highlights: string[];
  setHighlights: (v: string[]) => void;
  cfg: typeof FORM_CONFIG[FormType];
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const t = draft.trim();
    if (!t || highlights.length >= MAX_HIGHLIGHTS || highlights.includes(t)) {
      setDraft(""); return;
    }
    setHighlights([...highlights, t]);
    setDraft("");
    inputRef.current?.focus();
  };

  const remove = (i: number) => setHighlights(highlights.filter((_, idx) => idx !== i));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); add(); }
    if (e.key === "Backspace" && draft === "" && highlights.length > 0) {
      setHighlights(highlights.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Tag grid — mirrors detail page 2-col CheckCircle layout */}
      {highlights.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {highlights.map((tag, i) => (
            <div
              key={tag}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f]"
            >
              <CheckCircle2 size={13} className="text-teal-500 shrink-0 flex-none" />
              <span className="text-xs font-medium text-stone-700 dark:text-stone-200 truncate flex-1">{tag}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="ml-auto shrink-0 p-0.5 rounded text-stone-400 hover:text-red-500 transition-colors"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      {highlights.length < MAX_HIGHLIGHTS && (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            maxLength={40}
            placeholder={
              highlights.length === 0
                ? "e.g. M2 Pro Chip, 16GB RAM, Water Resistant..."
                : "Add another highlight..."
            }
            className={cn(
              "flex-1 rounded-xl border border-stone-200 dark:border-[#2a2d3e]",
              "bg-white dark:bg-[#13151f] text-stone-800 dark:text-stone-100 text-sm",
              "px-3.5 py-2.5 outline-none transition-colors",
              "focus:border-stone-400 dark:focus:border-stone-500",
              "placeholder:text-stone-400 dark:placeholder:text-stone-600"
            )}
          />
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim()}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0",
              "border border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300",
              "hover:border-stone-400 dark:hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-[#252837]",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            <Plus size={14} /> Add
          </button>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <FieldHint>
          Press <kbd className="text-[10px] font-mono bg-stone-100 dark:bg-stone-800 px-1 rounded">Enter</kbd> or click Add.
          These appear as feature highlights on the listing page.
        </FieldHint>
        <span className={cn(
          "text-xs font-semibold shrink-0",
          highlights.length >= MAX_HIGHLIGHTS
            ? "text-amber-600 dark:text-amber-400"
            : "text-stone-400 dark:text-stone-500"
        )}>
          {highlights.length}/{MAX_HIGHLIGHTS}
        </span>
      </div>
    </div>
  );
}

function AmenitiesInput({
  amenities, setAmenities,
}: {
  amenities: string[];
  setAmenities: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const value = draft.trim();
    if (!value) {
      setDraft("");
      return;
    }
    if (amenities.length >= MAX_AMENITIES) return;
    const exists = amenities.some((item) => item.toLowerCase() === value.toLowerCase());
    if (exists) {
      setDraft("");
      return;
    }

    setAmenities([...amenities, value]);
    setDraft("");
    inputRef.current?.focus();
  };

  const remove = (index: number) => {
    setAmenities(amenities.filter((_, idx) => idx !== index));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
    if (e.key === "Backspace" && draft === "" && amenities.length > 0) {
      setAmenities(amenities.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {amenities.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {amenities.map((item, i) => (
            <div
              key={`${item}-${i}`}
              className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 dark:border-[#2a2d3e] dark:bg-[#13151f]"
            >
              <CheckCircle2 size={13} className="shrink-0 text-teal-500" />
              <span className="flex-1 truncate text-xs font-medium text-stone-700 dark:text-stone-200">{item}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="ml-auto rounded p-0.5 text-stone-400 transition-colors hover:text-red-500"
                aria-label="Remove amenity"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {amenities.length < MAX_AMENITIES && (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            maxLength={40}
            placeholder={amenities.length === 0 ? "e.g. Air Conditioning, Parking, WiFi" : "Add another amenity..."}
            className={cn(
              "flex-1 rounded-xl border border-stone-200 dark:border-[#2a2d3e]",
              "bg-white dark:bg-[#13151f] text-stone-800 dark:text-stone-100 text-sm",
              "px-3.5 py-2.5 outline-none transition-colors",
              "focus:border-stone-400 dark:focus:border-stone-500",
              "placeholder:text-stone-400 dark:placeholder:text-stone-600"
            )}
          />
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim()}
            className={cn(
              "shrink-0 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all",
              "flex items-center gap-1.5 border-stone-200 text-stone-600 dark:border-[#2a2d3e] dark:text-stone-300",
              "hover:border-stone-400 hover:bg-stone-50 dark:hover:border-stone-500 dark:hover:bg-[#252837]",
              "disabled:cursor-not-allowed disabled:opacity-40"
            )}
          >
            <Plus size={14} /> Add
          </button>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <FieldHint>
          Press <kbd className="rounded bg-stone-100 px-1 text-[10px] font-mono dark:bg-stone-800">Enter</kbd> or click Add.
          Added amenities appear as listing features.
        </FieldHint>
        <span className={cn(
          "shrink-0 text-xs font-semibold",
          amenities.length >= MAX_AMENITIES ? "text-amber-600 dark:text-amber-400" : "text-stone-400 dark:text-stone-500"
        )}>
          {amenities.length}/{MAX_AMENITIES}
        </span>
      </div>
    </div>
  );
}

// ─── Image upload zone ────────────────────────────────────────────────────────────
function ImageUploadZone({
  images, setImages,
}: {
  images: { file: File; preview: string }[];
  setImages: React.Dispatch<React.SetStateAction<{ file: File; preview: string }[]>>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isFull  = images.length >= 8;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const added = Array.from(files)
      .slice(0, 8 - images.length)
      .map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
    setImages((prev) => [...prev, ...added].slice(0, 8));
  };

  const remove = (i: number) =>
    setImages((prev) => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, idx) => idx !== i); });

  return (
    <div className="flex flex-col gap-3">
      {!isFull && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          className={cn(
            "w-full rounded-2xl border-2 border-dashed border-stone-200 dark:border-[#2a2d3e]",
            "bg-stone-50 dark:bg-[#13151f] text-stone-400",
            "hover:border-stone-400 dark:hover:border-stone-500 transition-colors",
            "p-8 flex flex-col items-center gap-3 cursor-pointer"
          )}
        >
          <ImagePlus size={28} />
          <div className="text-center">
            <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Click or drag photos here</p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">JPG, PNG, WEBP · Max 5 MB each · Up to 8 photos</p>
          </div>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((img, i) => (
            <div key={img.preview} className="relative group aspect-square rounded-xl overflow-hidden bg-stone-100 dark:bg-[#13151f]">
              <img src={img.preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              {i === 0 && (
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5 uppercase tracking-wider">
                  Primary
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 bg-red-500/90 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </div>
          ))}
          {!isFull && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-stone-200 dark:border-[#2a2d3e] flex items-center justify-center text-stone-400 hover:border-stone-400 transition-colors"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      )}

      {images.length > 0 && (
        <p className="text-xs text-stone-400 dark:text-stone-500">
          {images.length}/8 photos added.{images.length < 3 ? " Adding more photos increases buyer interest." : ""}
        </p>
      )}
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────────
function StepIndicator({ steps, current, cfg }: {
  steps: readonly string[];
  current: number;
  cfg: typeof FORM_CONFIG[FormType];
}) {
  return (
    <div className="flex items-center w-full">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-200",
              i < current
                ? `${cfg.activeBg} border-transparent ${cfg.activeTxt}`
                : i === current
                  ? `bg-white dark:bg-[#1c1f2e] ${cfg.accentBorder} ${cfg.accentCls}`
                  : "bg-stone-100 dark:bg-[#13151f] border-stone-200 dark:border-[#2a2d3e] text-stone-400 dark:text-stone-600"
            )}>
              {i < current ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span className={cn(
              "text-[10px] font-semibold whitespace-nowrap hidden sm:block",
              i === current ? cfg.accentCls : "text-stone-400 dark:text-stone-600"
            )}>
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn(
              "flex-1 h-0.5 mx-1.5 mb-5 sm:mb-3 rounded-full transition-all duration-300",
              i < current ? cfg.badgeDot : "bg-stone-200 dark:bg-[#2a2d3e]"
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Service inclusions list ──────────────────────────────────────────────────────
function InclusionList({ items, setItems }: { items: string[]; setItems: (v: string[]) => void }) {
  const update = (i: number, v: string) => { const n = [...items]; n[i] = v; setItems(n); };
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center">
          <CheckCircle2 size={13} className="text-violet-500 shrink-0" />
          <StyledInput
            value={item}
            onChange={(e) => update(i, e.target.value)}
            placeholder="e.g. Coil & filter deep clean"
            className="flex-1"
          />
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => setItems(items.filter((_, idx) => idx !== i))}
              className="p-2 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
      {items.length < 10 && (
        <button
          type="button"
          onClick={() => setItems([...items, ""])}
          className="flex items-center gap-1.5 text-xs font-semibold text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 mt-1 w-fit transition-colors"
        >
          <Plus size={12} /> Add item
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN FORM
// ═══════════════════════════════════════════════════════════════════════════════
interface ListingFormProps {
  type:         FormType;
  initialData?: Partial<ListingFormData>;
  isEdit?:      boolean;
  listingId?:   string;
}

export default function ListingForm({ type, initialData, isEdit = false, listingId }: ListingFormProps) {
  const router = useRouter();
  const { user } = useUser();
  const cfg    = FORM_CONFIG[type];
  const initialAvailableDate = parseISODate(initialData?.availability ?? "");
  const now = new Date();

  const [step,       setStep]   = useState(0);
  const [submitting, setSub]    = useState(false);
  const [errors,     setErrors] = useState<Record<string, string>>({});

  // Common
  const [title,       setTitle]     = useState(initialData?.title       ?? "");
  const [category,    setCategory]  = useState(initialData?.category    ?? "");
  const [price,       setPrice]     = useState(initialData?.price       ?? "");
  const [priceUnit,   setPriceUnit] = useState(initialData?.priceUnit   ?? PRICE_UNITS[type][0]);
  const [description, setDesc]      = useState(initialData?.description ?? "");
  const [highlights,  setHL]        = useState<string[]>(initialData?.highlights ?? []);
  // Location
  const [locationCity, setCity] = useState(initialData?.locationCity ?? "");
  const [locationProv, setProv] = useState(initialData?.locationProv ?? "");
  const [locationBrgy, setBrgy] = useState(initialData?.locationBrgy ?? "");
  // Sell
  const [condition,      setCond]    = useState(initialData?.condition      ?? "");
  const [deliveryMethod, setDeliv]   = useState(initialData?.deliveryMethod ?? "");
  // Rent
  const [minPeriod,   setMinPer] = useState(initialData?.minPeriod   ?? "");
  const [availability,setAvail]  = useState(initialData?.availability ?? "");
  const [deposit,     setDep]    = useState(initialData?.deposit      ?? "");
  const [dayoff,   setDayOff]   = useState<string[]>(initialData?.dayoffs ?? []);
  const [calendarYear, setCalendarYear] = useState(initialAvailableDate?.getFullYear() ?? now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(initialAvailableDate?.getMonth() ?? now.getMonth());
  const [calendarHoverDate, setCalendarHoverDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [timeWindows, setTimeWindows] = useState<TimeWindowRange[]>([]);
  const [timeWindowError, setTimeWindowError] = useState("");
  const [amenities,   setAmen]   = useState<string[]>(initialData?.amenities ?? []);
  // Service
  const [turnaround,  setTA]   = useState(initialData?.turnaround  ?? "");
  const [serviceArea, setSA]   = useState(initialData?.serviceArea ?? "");
  const [arrangement, setArrangement]   = useState(initialData?.arrangement ?? "");
  const [inclusions,  setIncl] = useState<string[]>(initialData?.inclusions ?? [""]);
  // Images
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  // Location options
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [barangays, setBarangays] = useState<LocationOption[]>([]);
  const [selectedProvCode, setSelectedProvCode] = useState("");
  const [selectedCityCode, setSelectedCityCode] = useState("");
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  // Default location from user profile for create flow only.
  useEffect(() => {
    if (isEdit) return;
    if (initialData?.locationProv || initialData?.locationCity || initialData?.locationBrgy) return;
    if (!user) return;

    if (user.locationProv) setProv(user.locationProv);
    if (user.locationCity) setCity(user.locationCity);
    if (user.locationBrgy) setBrgy(user.locationBrgy);
    return;
  }, [isEdit, initialData?.locationProv, initialData?.locationCity, initialData?.locationBrgy, user]);

  useEffect(() => {
    let mounted = true;
    const loadProvinces = async () => {
      setLoadingProvinces(true);
      try {
        const data = await getProvinces();
        if (!mounted) return;
        setProvinces(data);
      } finally {
        if (mounted) setLoadingProvinces(false);
      }
    };

    void loadProvinces();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!locationProv || provinces.length === 0) return;
    const matched = provinces.find((p) => p.name === locationProv);
    if (matched && matched.code !== selectedProvCode) {
      setSelectedProvCode(matched.code);
    }
    return;
  }, [locationProv, provinces, selectedProvCode]);

  useEffect(() => {
    if (!selectedProvCode) {
      setCities([]);
      setSelectedCityCode("");
      return;
    }

    let mounted = true;
    const loadCities = async () => {
      setLoadingCities(true);
      try {
        const data = await getCitiesByProvince(selectedProvCode);
        if (!mounted) return;
        setCities(data);

        const selectedProvince = provinces.find((p) => p.code === selectedProvCode);
        if (selectedProvince) {
          setProv(selectedProvince.name);
        }

        const matchedCity = data.find((x) => x.name === locationCity);
        setSelectedCityCode(matchedCity?.code ?? "");
      } finally {
        if (mounted) setLoadingCities(false);
      }
    };

    void loadCities();
    return () => {
      mounted = false;
    };
  }, [selectedProvCode, provinces, locationCity]);

  useEffect(() => {
    if (!selectedCityCode) {
      setBarangays([]);
      return;
    }

    let mounted = true;
    const loadBarangays = async () => {
      setLoadingBarangays(true);
      try {
        const data = await getBarangaysByCity(selectedCityCode);
        if (!mounted) return;
        setBarangays(data);

        const selectedCity = cities.find((city) => city.code === selectedCityCode);
        if (selectedCity) {
          setCity(selectedCity.name);
        }
      } finally {
        if (mounted) setLoadingBarangays(false);
      }
    };

    void loadBarangays();
    return () => {
      mounted = false;
    };
  }, [selectedCityCode, cities]);

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!title.trim())                           e.title       = "Title is required.";
      if (!category)                               e.category    = "Please select a category.";
      if (!price || isNaN(+price) || +price <= 0) e.price       = "Enter a valid price.";
      if (!description.trim())                     e.description = "Description is required.";
    }
    if (s === 1) {
      if (type === "sell") {
        if (!condition)      e.condition      = "Please select a condition.";
        if (!deliveryMethod) e.deliveryMethod = "Please choose a delivery option.";
      }
      if (type === "rent") {
        if (!minPeriod.trim()) e.minPeriod = "Minimum rental period is required.";
      }
      if (type === "service") {
        if (!turnaround.trim())  e.turnaround  = "Turnaround time is required.";
        if (!serviceArea.trim()) e.serviceArea = "Service area is required.";
      }
    }
    if (s === 2) {
      if (!locationCity.trim()) e.locationCity = "City / Municipality is required.";
      if (!locationProv)        e.locationProv = "Province is required.";
      if (!isEdit && images.length === 0) e.images = "At least one photo is required.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next   = () => { if (validate(step)) setStep((s) => s + 1); };
  const back   = () => { setErrors({}); setStep((s) => s - 1); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(2)) return;

    let compressedImages: UploadImagePayload[] = [];
    try {
      compressedImages = await Promise.all(images.map((img) => compressImage(img.file)));
    } catch {
      setErrors((prev) => ({ ...prev, submit: "Failed to process one or more images." }));
      return;
    }

    const commonData = {
      type,
      title: title.trim(),
      category,
      price: Math.round(Number(price)),
      priceUnit,
      description: description.trim(),
      highlights,
      inclusions,
      amenities,
      images: compressedImages,
      locationCity: locationCity.trim(),
      locationProv,
      locationBrgy: locationBrgy.trim(),
    };

    const typeSpecific: {
      sellData?: { condition: string; deliveryMethod: string };
      rentData?: { minPeriod: string; availability: string; deposit: string; deliveryMethod: string };
      serviceData?: { availability: string; turnaround: string; serviceArea: string; arrangement: string };
    } = {};

    if (type === "sell") {
      typeSpecific.sellData = {
        condition,
        deliveryMethod,
      };
    }

    if (type === "rent") {
      typeSpecific.rentData = {
        minPeriod,
        availability,
        deposit,
        deliveryMethod,
      };
    }

    if (type === "service") {
      typeSpecific.serviceData = {
        availability,
        turnaround,
        serviceArea,
        arrangement,
      };
    }

    setSub(true);
    setErrors((prev) => ({ ...prev, submit: "" }));

    try {
      const endpoint = isEdit
        ? `${process.env.NEXT_PUBLIC_API_URL}/listing/${listingId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/listing`;

      const response = await fetch(endpoint, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...commonData, ...typeSpecific }),
      });

      const parsedJson = await response.json();
      if (!response.ok) {
        throw new Error(parsedJson?.data?.message || (isEdit ? "Failed to update listing." : "Failed to create listing."));
      }

      const savedListingId = parsedJson?.data?.listingId;
      router.push(`/listing/${savedListingId ?? listingId ?? "1"}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : (isEdit ? "Failed to update listing." : "Failed to create listing.");
      setErrors((prev) => ({ ...prev, submit: message }));
    } finally {
      setSub(false);
    }
  };

  const toggleDayOff = (a: string) =>
    setDayOff((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);

  const selectedAvailabilityDate = parseISODate(availability);

  useEffect(() => {
    const parsed = parseISODate(availability);
    if (!parsed) return;
    setCalendarYear(parsed.getFullYear());
    setCalendarMonth(parsed.getMonth());
  }, [availability]);

  useEffect(() => {
    if (!selectedAvailabilityDate) return;
    if (isDayUnavailableBySelection(selectedAvailabilityDate, dayoff)) {
      setAvail("");
    }
  }, [dayoff, selectedAvailabilityDate]);

  const prevAvailabilityMonth = () => {
    if (calendarMonth === 0) {
      setCalendarYear((y) => y - 1);
      setCalendarMonth(11);
      return;
    }
    setCalendarMonth((m) => m - 1);
  };

  const nextAvailabilityMonth = () => {
    if (calendarMonth === 11) {
      setCalendarYear((y) => y + 1);
      setCalendarMonth(0);
      return;
    }
    setCalendarMonth((m) => m + 1);
  };

  const addTimeWindow = () => {
    setTimeWindowError("");
    if (!startTime || !endTime) {
      setTimeWindowError("Please set both start and end time.");
      return;
    }
    if (startTime >= endTime) {
      setTimeWindowError("End time must be later than start time.");
      return;
    }
    if (timeWindows.length >= 8) {
      setTimeWindowError("You can add up to 8 window times only.");
      return;
    }

    const duplicate = timeWindows.some((slot) => slot.start === startTime && slot.end === endTime);
    if (duplicate) {
      setTimeWindowError("This time window already exists.");
      return;
    }

    setTimeWindows((prev) => [
      ...prev,
      {
        id: `${startTime}-${endTime}-${Date.now()}`,
        start: startTime,
        end: endTime,
      },
    ]);
  };

  const removeTimeWindow = (id: string) => {
    setTimeWindows((prev) => prev.filter((slot) => slot.id !== id));
  };

  // ── Step 0 — Basic Info ──────────────────────────────────────────────────────
  const renderS0 = () => (
    <>
      <Section>
        {/* Title */}
        <div>
          <FieldLabel required>Listing Title</FieldLabel>
          <StyledInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder={
              type === "sell"    ? "e.g. MacBook Pro M2 2023 — Space Gray 16\""  :
              type === "rent"    ? "e.g. Studio Unit for Rent — Fully Furnished" :
                                   "e.g. Professional Aircon Cleaning & Repair"
            }
          />
          <div className="flex justify-between mt-1.5">
            <ErrMsg msg={errors.title} />
            <span className="text-xs text-stone-400 ml-auto">{title.length}/120</span>
          </div>
        </div>

        {/* Category + Price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel required>Category</FieldLabel>
            <StyledSelect value={category} onChange={setCategory}>
              <option value="">Select a category</option>
              {CATEGORIES[type].map((c) => <option key={c}>{c}</option>)}
            </StyledSelect>
            <ErrMsg msg={errors.category} />
          </div>
          <div>
            <FieldLabel required>Price</FieldLabel>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-semibold pointer-events-none">₱</span>
                <StyledInput
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  min={0}
                  className="pl-8"
                />
              </div>
              <StyledSelect value={priceUnit} onChange={setPriceUnit} className="w-36 shrink-0">
                {PRICE_UNITS[type].map((u) => <option key={u}>{u}</option>)}
              </StyledSelect>
            </div>
            <ErrMsg msg={errors.price} />
          </div>
        </div>
      </Section>

      {/* Description */}
      <Section title="About This Listing">
        <div>
          <FieldLabel required>
            {type === "service" ? "Describe your service" : "Describe the item / property"}
          </FieldLabel>
          <StyledTextarea
            value={description}
            onChange={setDesc}
            placeholder={
              type === "sell"    ? "Include brand, model, specs, usage history, reason for selling, and any known issues..."   :
              type === "rent"    ? "Describe the property — features, nearby landmarks, house rules, and what's included..."  :
                                   "Describe your service — experience, what clients can expect, tools used, process..."
            }
            rows={6}
          />
          <ErrMsg msg={errors.description} />
          <FieldHint>Detailed descriptions get more inquiries and build buyer trust.</FieldHint>
        </div>
      </Section>
    </>
  );

  // ── Step 1 — Type-specific ───────────────────────────────────────────────────
  const renderS1 = () => {

    if (type === "sell") return (
      <>
        {/* Condition */}
        <Section title="Item Condition">
          <div>
            <FieldLabel required>Select the condition</FieldLabel>
            <div className="flex flex-col gap-2">
              {CONDITIONS.map((c) => (
                <RadioOption
                  key={c.value}
                  selected={condition === c.value}
                  onClick={() => setCond(c.value)}
                  label={c.value}
                  hint={c.hint}
                  cfg={cfg}
                />
              ))}
            </div>
            <ErrMsg msg={errors.condition} />
          </div>
        </Section>

        {/* What's included */}
        <Section title="What's Included">
          <div>
            <FieldLabel>List what buyers receive with this listing</FieldLabel>
            <InclusionList items={inclusions} setItems={setIncl} />
            <FieldHint>Clear inclusions help buyers understand exactly what they are paying for.</FieldHint>
          </div>
        </Section>
        {/* Highlights */}
        <Section title="Highlights">
          <div>
            <FieldLabel>Key features <span className="normal-case tracking-normal font-normal text-stone-400">(up to {MAX_HIGHLIGHTS})</span></FieldLabel>
            <HighlightsInput highlights={highlights} setHighlights={setHL} cfg={cfg} />
          </div>
        </Section>

        {/* Delivery */}
        <Section title="Meet-up & Delivery">
          <div>
            <FieldLabel required>How will you hand over the item?</FieldLabel>
            <div className="flex flex-col gap-2">
              {DELIVERY_OPTIONS.map((d) => (
                <RadioOption
                  key={d.value}
                  selected={deliveryMethod === d.value}
                  onClick={() => setDeliv(d.value)}
                  label={d.value}
                  hint={d.desc}
                  cfg={cfg}
                />
              ))}
            </div>
            <ErrMsg msg={errors.deliveryMethod} />
          </div>
        </Section>
      </>
    );

    if (type === "rent") {
      const rentCalColors: BookingCalendarColors = {
        solid: "bg-teal-600",
        rangeFill: "bg-teal-100 dark:bg-teal-900/25",
        ringToday: "ring-teal-500 dark:ring-teal-500",
        hoverBg: "hover:bg-teal-50 dark:hover:bg-teal-950/30 hover:text-teal-700 dark:hover:text-teal-300",
      };

      return (
        <>
        <Section title="Rental Terms">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Minimum Rental Period</FieldLabel>
              <StyledInput
                value={minPeriod}
                onChange={(e) => setMinPer(e.target.value)}
                placeholder="e.g. 3 months, 1 week, daily"
              />
              <ErrMsg msg={errors.minPeriod} />
            </div>
            <div>
              <FieldLabel>Deposit / Advance Requirements</FieldLabel>
              <StyledInput
                value={deposit}
                onChange={(e) => setDep(e.target.value)}
                placeholder="e.g. 2 months deposit + 1 month advance"
              />
            </div>
          </div>
          <div>
            <FieldLabel>Meet-up / Viewing Arrangement</FieldLabel>
            <div className="flex flex-col gap-2">
              {DELIVERY_OPTIONS.map((d) => (
                <RadioOption
                  key={d.value}
                  selected={deliveryMethod === d.value}
                  onClick={() => setDeliv(d.value)}
                  label={d.value}
                  hint={d.desc}
                  cfg={cfg}
                />
              ))}
            </div>
          </div>
        </Section>

        <Section title="Availability">
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-[#2a2d3e] dark:bg-[#13151f]">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                    Available From
                  </p>
                  {availability && (
                    <button
                      type="button"
                      onClick={() => setAvail("")}
                      className="text-[11px] text-stone-400 transition-colors hover:text-red-500 dark:hover:text-red-400"
                    >
                      Clear date
                    </button>
                  )}
                </div>

                <BookingCalendar
                  viewYear={calendarYear}
                  viewMonth={calendarMonth}
                  onPrevMonth={prevAvailabilityMonth}
                  onNextMonth={nextAvailabilityMonth}
                  isUnavailable={(d) => isDayUnavailableBySelection(d, dayoff)}
                  startDate={selectedAvailabilityDate}
                  endDate={null}
                  hoverDate={calendarHoverDate}
                  onSelect={(d) => {
                    setAvail(toISODate(sod(d)));
                    setCalendarHoverDate(null);
                  }}
                  onHover={setCalendarHoverDate}
                  singleSelect
                  colors={rentCalColors}
                />

                <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
                  {selectedAvailabilityDate
                    ? `Selected: ${fmtDateShort(selectedAvailabilityDate)}`
                    : "Pick the first date this property can be booked."}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-[#2a2d3e] dark:bg-[#13151f]">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                  Days Off
                </p>
                <div className="flex flex-wrap gap-2 lg:flex-col">
                  {DAYOFF.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleDayOff(a)}
                      className={cn(
                        "rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-all",
                        dayoff.includes(a)
                          ? `${cfg.accentBorder} ${cfg.accentBg} ${cfg.accentCls}`
                          : "border-stone-200 text-stone-500 hover:border-stone-300 dark:border-[#2a2d3e] dark:text-stone-400 dark:hover:border-stone-600",
                      )}
                    >
                      {dayoff.includes(a) ? "✓ " : ""}
                      {a}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-stone-400 dark:text-stone-500">
                  Selected days are shown as unavailable on the calendar.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-[#2a2d3e] dark:bg-[#13151f]">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                Window Time
              </p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
                <div>
                  <FieldLabel>Start Time</FieldLabel>
                  <StyledInput
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <span className="pb-2 text-center text-sm font-semibold text-stone-400">to</span>
                <div>
                  <FieldLabel>End Time</FieldLabel>
                  <StyledInput
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={addTimeWindow}
                  disabled={timeWindows.length >= 8}
                  className={cn(
                    "mb-0.5 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
                    "border border-stone-200 text-stone-600 hover:border-stone-400 hover:bg-stone-100",
                    "dark:border-[#2a2d3e] dark:text-stone-300 dark:hover:border-stone-500 dark:hover:bg-[#252837]",
                    "disabled:cursor-not-allowed disabled:opacity-40"
                  )}
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              <ErrMsg msg={timeWindowError} />

              {timeWindows.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {timeWindows.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-[#2a2d3e] dark:bg-[#1c1f2e]"
                    >
                      <span className="font-semibold text-stone-700 dark:text-stone-200">
                        {toTwelveHour(slot.start)} - {toTwelveHour(slot.end)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTimeWindow(slot.id)}
                        className="rounded-md p-1 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20"
                        aria-label="Remove window time"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-stone-400 dark:text-stone-500">
                  No time windows added yet.
                </p>
              )}

              <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">
                {timeWindows.length}/8 windows added.
              </p>
            </div>
          </div>
        </Section>

        {/* Highlights */}
        <Section title="Highlights">
          <div>
            <FieldLabel>
              Key features{" "}
              <span className="normal-case tracking-normal font-normal text-stone-400">
                (up to {MAX_HIGHLIGHTS})
              </span>
            </FieldLabel>
            <HighlightsInput
              highlights={highlights}
              setHighlights={setHL}
              cfg={cfg}
            />
          </div>
        </Section>

        {/* Amenities */}
        <Section title="Amenities & Features">
          <div>
            <FieldLabel>Add amenities</FieldLabel>
            <AmenitiesInput amenities={amenities} setAmenities={setAmen} />
          </div>
        </Section>
      </>
      );
    }

    // service
    return (
      <>
        <Section title="Service Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Turnaround / Duration</FieldLabel>
              <StyledInput value={turnaround} onChange={(e) => setTA(e.target.value)} placeholder="e.g. Same-day, 1–3 business days" />
              <ErrMsg msg={errors.turnaround} />
            </div>
            <div>
              <FieldLabel>Available From</FieldLabel>
              <StyledInput type="date" value={availability} onChange={(e) => setAvail(e.target.value)} />
            </div>
            
            <div>
              <FieldLabel required>Service Area</FieldLabel>
              <StyledInput value={serviceArea} onChange={(e) => setSA(e.target.value)} placeholder="e.g. Around Laguna, Batangas, Manila" />
              <ErrMsg msg={errors.serviceArea} />
            </div>
            <div>
              <FieldLabel>Arrangement</FieldLabel>
              <StyledInput value={arrangement} onChange={(e) => setArrangement(e.target.value)} placeholder="e.g. Onsite, Remote, Home-Visit" />
              <ErrMsg msg={errors.arrangement} />
            </div>
          </div>
        </Section>

        {/* What's included */}
        <Section title="What's Included">
          <div>
            <FieldLabel>List what clients receive with this service</FieldLabel>
            <InclusionList items={inclusions} setItems={setIncl} />
            <FieldHint>Clear inclusions help clients understand exactly what they are paying for.</FieldHint>
          </div>
        </Section>

        {/* Highlights */}
        <Section title="Highlights">
          <div>
            <FieldLabel>Key features <span className="normal-case tracking-normal font-normal text-stone-400">(up to {MAX_HIGHLIGHTS})</span></FieldLabel>
            <HighlightsInput highlights={highlights} setHighlights={setHL} cfg={cfg} />
          </div>
        </Section>
      </>
    );
  };

  // ── Step 2 — Location & Photos ───────────────────────────────────────────────
  const renderS2 = () => (
    <>
      <Section title="Pickup / Service Location">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <FieldLabel required>Province / Region</FieldLabel>
            <StyledSelect
              value={selectedProvCode}
              onChange={(code) => {
                const selected = provinces.find((p) => p.code === code);
                setSelectedProvCode(code);
                setProv(selected?.name ?? "");
                setSelectedCityCode("");
                setCity("");
                setBrgy("");
              }}
              disabled={loadingProvinces}
            >
              <option value="">{loadingProvinces ? "Loading provinces..." : "Select province"}</option>
              {provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </StyledSelect>
            <ErrMsg msg={errors.locationProv} />
          </div>
          <div>
            <FieldLabel required>City / Municipality</FieldLabel>
            <StyledSelect
              value={selectedCityCode}
              onChange={(code) => {
                const selected = cities.find((city) => city.code === code);
                setSelectedCityCode(code);
                setCity(selected?.name ?? "");
                setBrgy("");
              }}
              disabled={!selectedProvCode || loadingCities}
            >
              <option value="">
                {!selectedProvCode
                  ? "Select province first"
                  : loadingCities
                    ? "Loading cities/municipalities..."
                    : "Select city/municipality"}
              </option>
              {cities.map((city) => <option key={city.code} value={city.code}>{city.name}</option>)}
            </StyledSelect>
            <ErrMsg msg={errors.locationCity} />
          </div>
          <div>
            <FieldLabel>Barangay <span className="text-stone-400 font-normal normal-case tracking-normal">(optional)</span></FieldLabel>
            <StyledSelect
              value={locationBrgy}
              onChange={setBrgy}
              disabled={!selectedCityCode || loadingBarangays}
            >
              <option value="">
                {!selectedCityCode
                  ? "Select city first"
                  : loadingBarangays
                    ? "Loading barangays..."
                    : "Select barangay (optional)"}
              </option>
              {barangays.map((brgy) => <option key={brgy.code} value={brgy.name}>{brgy.name}</option>)}
            </StyledSelect>
          </div>
        </div>
        <FieldHint>Only your city and province are shown publicly — your exact address stays private.</FieldHint>
      </Section>

      <Section title="Photos">
        <ImageUploadZone images={images} setImages={setImages} />
        <ErrMsg msg={errors.images} />
        <FieldHint>
          The first photo is your primary listing image shown in search results.
          High-quality photos significantly improve your chances of a quick sale.
        </FieldHint>
      </Section>
    </>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-100 dark:bg-[#0f1117]">

      {/* Header */}
      <div className="bg-[#1e2433] border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-1">
            {isEdit ? "Edit Listing" : "Post a Listing"} · {cfg.label}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            {isEdit
              ? "Update your listing details"
              : `List something to ${type === "sell" ? "sell" : type === "rent" ? "rent out" : "offer"}`}
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            {isEdit
              ? "Make changes below and save when you're done."
              : "The more detail you provide, the more inquiries you'll receive."}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Step indicator */}
        <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm p-5 mb-5">
          <StepIndicator steps={cfg.steps} current={step} cfg={cfg} />
        </div>

        {/* Form */}
        <form onSubmit={submit} noValidate>
          <div className="flex flex-col gap-4">
            {step === 0 && renderS0()}
            {step === 1 && renderS1()}
            {step === 2 && renderS2()}
          </div>

          <ErrMsg msg={errors.submit} />

          {/* Nav */}
          <div className="flex items-center justify-between mt-6 pt-5 border-t border-stone-200 dark:border-[#2a2d3e]">
            {step > 0 ? (
              <button type="button" onClick={back}
                className="flex items-center gap-1.5 text-sm font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors">
                <ChevronLeft size={16} /> Back
              </button>
            ) : (
              <button type="button" onClick={() => router.push(isEdit ? `/listing/${listingId}` : "/create")}
                className="flex items-center gap-1.5 text-sm font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors">
                <ChevronLeft size={16} /> {isEdit ? "Back to listing" : "Change type"}
              </button>
            )}

            {step < 2 ? (
              <button type="button" onClick={next}
                className={cn("flex items-center gap-1.5 px-6 py-2.5 rounded-full text-sm font-bold transition-all", cfg.btnCls)}>
                Continue <ChevronRight size={15} />
              </button>
            ) : (
              <button type="submit" disabled={submitting}
                className={cn("flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all", cfg.btnCls, "disabled:opacity-60 disabled:cursor-not-allowed")}>
                {submitting
                  ? <><Loader2 size={14} className="animate-spin" /> {isEdit ? "Saving..." : "Publishing..."}</>
                  : <><CheckCircle2 size={14} /> {isEdit ? "Save Changes" : "Publish Listing"}</>
                }
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
