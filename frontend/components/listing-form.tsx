"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus, X, ChevronRight, ChevronLeft, AlertCircle,
  CheckCircle2, Loader2, Info, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  amenities:    string[];
  // Service
  turnaround:   string;
  serviceArea:  string;
  inclusions:   string[];
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
  sell:    ["(fixed price)", "(negotiable)"],
  rent:    ["/ month", "/ week", "/ day", "/ night", "/ hour"],
  service: ["/ hour", "/ project", "/ session", "/ unit", "/ day", "/ package"],
};

// Mirrors CONDITION_COLORS keys from the detail page
const CONDITIONS = [
  { value: "Brand New",  hint: "Unused, still in original packaging"   },
  { value: "Like New",   hint: "Used briefly, no visible defects"       },
  { value: "Good",       hint: "Normal wear, fully functional"          },
  { value: "Fair",       hint: "Noticeable wear, still works fine"      },
  { value: "For Parts",  hint: "Not working — sold as-is"               },
];

const DELIVERY_OPTIONS = [
  { value: "Meet-up only",        desc: "Buyer and seller meet in person"        },
  { value: "Delivery available",  desc: "Seller can arrange shipping / courier"  },
  { value: "Meet-up or Delivery", desc: "Either option works — buyer's choice"   },
];

const AMENITIES = [
  "WiFi", "Air Conditioning", "Hot Water", "Parking", "Security",
  "CCTV", "Swimming Pool", "Gym", "Elevator", "Generator",
  "Pet-Friendly", "Fully Furnished", "Semi-Furnished", "Near Transport",
];

const PROVINCES = [
  "Metro Manila", "Laguna", "Cavite", "Batangas", "Rizal",
  "Bulacan", "Pampanga", "Cebu", "Davao del Sur", "Iloilo", "Others",
];

const MAX_HIGHLIGHTS = 8;

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
  value, onChange, children, className,
}: { value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
  const cfg    = FORM_CONFIG[type];

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
  const [amenities,   setAmen]   = useState<string[]>(initialData?.amenities ?? []);
  // Service
  const [turnaround,  setTA]   = useState(initialData?.turnaround  ?? "");
  const [serviceArea, setSA]   = useState(initialData?.serviceArea ?? "");
  const [inclusions,  setIncl] = useState<string[]>(initialData?.inclusions ?? [""]);
  // Images
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);

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
    setSub(true);
    await new Promise((r) => setTimeout(r, 1200)); // TODO: replace with real API call
    setSub(false);
    router.push(`/listing/${listingId ?? "1"}`);
  };

  const toggleAmen = (a: string) =>
    setAmen((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);

  // ── Step 0 — Basic Info ──────────────────────────────────────────────────────
  const S0 = () => (
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
  const S1 = () => {

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

    if (type === "rent") return (
      <>
        <Section title="Rental Terms">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Minimum Rental Period</FieldLabel>
              <StyledInput value={minPeriod} onChange={(e) => setMinPer(e.target.value)} placeholder="e.g. 3 months, 1 week, daily" />
              <ErrMsg msg={errors.minPeriod} />
            </div>
            <div>
              <FieldLabel>Available From</FieldLabel>
              <StyledInput type="date" value={availability} onChange={(e) => setAvail(e.target.value)} />
            </div>
          </div>
          <div>
            <FieldLabel>Deposit / Advance Requirements</FieldLabel>
            <StyledInput value={deposit} onChange={(e) => setDep(e.target.value)} placeholder="e.g. 2 months deposit + 1 month advance" />
            <FieldHint>Clearly stating deposit terms prevents disputes with renters.</FieldHint>
          </div>
          <div>
            <FieldLabel>Meet-up / Viewing Arrangement</FieldLabel>
            <div className="flex flex-col gap-2">
              {DELIVERY_OPTIONS.map((d) => (
                <RadioOption key={d.value} selected={deliveryMethod === d.value} onClick={() => setDeliv(d.value)} label={d.value} hint={d.desc} cfg={cfg} />
              ))}
            </div>
          </div>
        </Section>

        {/* Highlights */}
        <Section title="Highlights">
          <div>
            <FieldLabel>Key features <span className="normal-case tracking-normal font-normal text-stone-400">(up to {MAX_HIGHLIGHTS})</span></FieldLabel>
            <HighlightsInput highlights={highlights} setHighlights={setHL} cfg={cfg} />
          </div>
        </Section>

        {/* Amenities */}
        <Section title="Amenities & Features">
          <div>
            <FieldLabel>Select all that apply</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmen(a)}
                  className={cn(
                    "text-xs font-semibold px-3 py-1.5 rounded-full border-2 transition-all",
                    amenities.includes(a)
                      ? `${cfg.accentBorder} ${cfg.accentBg} ${cfg.accentCls}`
                      : "border-stone-200 dark:border-[#2a2d3e] text-stone-500 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600"
                  )}
                >
                  {amenities.includes(a) && "✓ "}{a}
                </button>
              ))}
            </div>
          </div>
        </Section>
      </>
    );

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
              <FieldLabel required>Service Area</FieldLabel>
              <StyledInput value={serviceArea} onChange={(e) => setSA(e.target.value)} placeholder="e.g. Laguna, Batangas, South Metro Manila" />
              <ErrMsg msg={errors.serviceArea} />
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
  const S2 = () => (
    <>
      <Section title="Pickup / Service Location">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <FieldLabel required>Province / Region</FieldLabel>
            <StyledSelect value={locationProv} onChange={setProv}>
              <option value="">Select province</option>
              {PROVINCES.map((p) => <option key={p}>{p}</option>)}
            </StyledSelect>
            <ErrMsg msg={errors.locationProv} />
          </div>
          <div>
            <FieldLabel required>City / Municipality</FieldLabel>
            <StyledInput value={locationCity} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Calamba City" />
            <ErrMsg msg={errors.locationCity} />
          </div>
          <div>
            <FieldLabel>Barangay <span className="text-stone-400 font-normal normal-case tracking-normal">(optional)</span></FieldLabel>
            <StyledInput value={locationBrgy} onChange={(e) => setBrgy(e.target.value)} placeholder="e.g. Bgry. Uno" />
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
            {step === 0 && <S0 />}
            {step === 1 && <S1 />}
            {step === 2 && <S2 />}
          </div>

          {/* Nav */}
          <div className="flex items-center justify-between mt-6 pt-5 border-t border-stone-200 dark:border-[#2a2d3e]">
            {step > 0 ? (
              <button type="button" onClick={back}
                className="flex items-center gap-1.5 text-sm font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors">
                <ChevronLeft size={16} /> Back
              </button>
            ) : (
              <button type="button" onClick={() => router.push("/create")}
                className="flex items-center gap-1.5 text-sm font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors">
                <ChevronLeft size={16} /> Change type
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
