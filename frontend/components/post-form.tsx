"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import * as listingService from "@/services/listingService";
import Image from "next/image";
import { PostCardProps } from "@/components/post-card";

// ─────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────
type ListingType = "sale" | "rent" | "service";
type Condition   = "brand-new" | "like-new" | "good" | "fair" | "for-parts";

interface FormData {
  type: ListingType;
  category: string;
  title: string;
  description: string;
  price: string;
  priceUnit: string;
  location: string;
  condition: Condition | "";
  photos: File[];
}

// ─────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────
const LISTING_TYPES: { value: ListingType; label: string }[] = [
  { value: "sale",    label: "For Sale" },
  { value: "rent",    label: "For Rent" },
  { value: "service", label: "Service"  },
];

const CATEGORIES = {
  sale: ["Electronics", "Clothing & Accessories", "Furniture & Home", "Vehicles", "Sports & Hobbies", "Books", "Others"],
  rent: ["Real Estate", "Equipment", "Vehicles", "Event Spaces", "Others"],
  service: ["Home Services", "Professional Services", "Tutoring", "Transportation", "Others"],
};

const PRICE_UNITS: { value: string; label: string }[] = [
  { value: "fixed",   label: "Fixed"    },
  { value: "/day",    label: "/ day"    },
  { value: "/week",   label: "/ week"   },
  { value: "/month",  label: "/ month"  },
  { value: "/hour",   label: "/ hour"   },
  { value: "/unit",   label: "/ unit"   },
  { value: "nego",    label: "Negotiable" },
];

const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "brand-new", label: "Brand New" },
  { value: "like-new",  label: "Like New"  },
  { value: "good",      label: "Good"      },
  { value: "fair",      label: "Fair"      },
  { value: "for-parts", label: "For Parts" },
];

const STEPS = ["Details", "Photos", "Review"];

// ─────────────────────────────────────────
//  POST FORM COMPONENT
// ─────────────────────────────────────────
export default function PostForm() {
  const [step, setStep]       = useState(0);
  const [form, setForm]       = useState<FormData>({
    type: "sale",
    category: "",
    title: "",
    description: "",
    price: "",
    priceUnit: "fixed",
    location: "",
    condition: "",
    photos: [],
  });
  const [previews, setPreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof FormData, value: string | File[]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 10);
    set("photos", files);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const router = useRouter();

  const handleSubmit = () => {
    // create a lightweight listing object for display
    const normalize = (text: string) =>
      text
        .toLowerCase()
        .replace(/\s*&\s*/g, "-")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const newListing: PostCardProps = {
      id: Date.now().toString(),
      title: form.title,
      price: Number(form.price) || 0,
      priceUnit: form.priceUnit,
      type: form.type,
      category: normalize(form.category),
      location: form.location,
      postedAt: "Just now",
      imageUrl: previews[0] || "",
      seller: { name: "You", rating: 0 },
    };

    listingService.saveListing(newListing);
    router.push("/");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* ── HEADER ── */}
      <div className="mb-6">
        <h1 className="font-brand text-2xl text-stone-800 font-semibold">Create a Listing</h1>
        <p className="text-sm text-stone-500 mt-1">
          Fill in the details below to post your item, rental, or service.
        </p>
      </div>

      {/* ── STEP INDICATOR ── */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                i < step  ? "bg-stone-800" :
                i === step ? "bg-stone-800 ring-4 ring-stone-200" :
                "bg-stone-300"
              }`} />
              <span className={`text-xs font-medium transition-colors ${
                i <= step ? "text-stone-800" : "text-stone-400"
              }`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-stone-200 mx-2" />}
          </div>
        ))}
      </div>

      {/* ══════════════════════
          STEP 0 — DETAILS
      ══════════════════════ */}
      {step === 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6">

          {/* Listing type */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Listing Type</label>
            <div className="flex gap-2">
              {LISTING_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => set("type", t.value)}
                  className={`flex-1 border rounded-xl py-2.5 text-sm font-medium transition-all ${
                    form.type === t.value
                      ? "bg-stone-800 text-stone-100 border-stone-800"
                      : "border-stone-200 text-stone-600 hover:border-stone-400"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Category</label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-700 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 transition-all appearance-none"
            >
              <option value="">Select a category…</option>
              {CATEGORIES[form.type].map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Title</label>
            <input
              type="text"
              value={form.title}
              maxLength={80}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. iPhone 14 Pro Max 256GB — Space Black"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 transition-all"
            />
            <p className="text-xs text-stone-400 mt-1.5 text-right">{form.title.length} / 80</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe your listing — condition, specs, availability, terms…"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 transition-all resize-none"
            />
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Price (₱)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-medium">₱</span>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="0"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Price Unit</label>
              <select
                value={form.priceUnit}
                onChange={(e) => set("priceUnit", e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-700 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 transition-all appearance-none"
              >
                {PRICE_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Location</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 0 1-2.828 0L6.343 16.657a8 8 0 1 1 11.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
              </svg>
              <input
                type="text"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="City, Province or Barangay"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 transition-all"
              />
            </div>
          </div>

          {/* Condition (sale only) */}
          {form.type === "sale" && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Condition</label>
              <div className="flex gap-2 flex-wrap">
                {CONDITIONS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => set("condition", c.value)}
                    className={`border rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                      form.condition === c.value
                        ? "bg-stone-800 text-stone-100 border-stone-800"
                        : "border-stone-200 text-stone-600 hover:border-stone-400"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ══════════════════════
          STEP 1 — PHOTOS
      ══════════════════════ */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <label className="block text-sm font-medium text-stone-700 mb-3">
            Photos <span className="text-stone-400 font-normal">(up to 10)</span>
          </label>

          <div className="grid grid-cols-4 gap-3">
            {/* Upload trigger */}
            <button
              onClick={() => fileRef.current?.click()}
              className="aspect-square border-2 border-dashed border-stone-200 rounded-xl flex flex-col items-center justify-center gap-1.5 bg-stone-50 hover:border-stone-400 hover:bg-stone-100 transition-all"
            >
              <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-xs text-stone-400">Add Photo</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={handlePhotos}
            />

            {/* Preview uploaded */}
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200">
                <Image src={src} alt={`Photo ${i + 1}`} fill className="object-cover" />
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 bg-stone-800 text-stone-100 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                    Cover
                  </span>
                )}
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 3 - previews.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square border border-dashed border-stone-200 rounded-xl bg-stone-50" />
            ))}
          </div>

          <p className="text-xs text-stone-400 mt-3">First photo will be the cover. JPG, PNG, WEBP accepted.</p>
        </div>
      )}

      {/* ══════════════════════
          STEP 2 — REVIEW
      ══════════════════════ */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          <h2 className="font-brand text-lg text-stone-800 font-semibold">Review your listing</h2>

          <div className="space-y-3 text-sm">
            {[
              { label: "Type",        value: LISTING_TYPES.find(t => t.value === form.type)?.label },
              { label: "Category",    value: form.category  || "—" },
              { label: "Title",       value: form.title     || "—" },
              { label: "Price",       value: form.price ? `₱${Number(form.price).toLocaleString()} ${form.priceUnit}` : "—" },
              { label: "Location",    value: form.location  || "—" },
              { label: "Condition",   value: form.condition || "—" },
              { label: "Photos",      value: `${form.photos.length} photo(s)` },
            ].map((row) => (
              <div key={row.label} className="flex justify-between py-2 border-b border-stone-100 last:border-0">
                <span className="text-stone-500">{row.label}</span>
                <span className="text-stone-800 font-medium text-right max-w-[60%] truncate">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ACTIONS ── */}
      <div className="flex items-center justify-between mt-6">
        <button className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
          Save as Draft
        </button>
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="border border-stone-200 text-stone-600 text-sm font-medium px-5 py-2.5 rounded-full hover:bg-stone-100 transition-colors"
            >
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="bg-stone-800 text-stone-100 text-sm font-medium px-6 py-2.5 rounded-full hover:bg-stone-700 transition-colors flex items-center gap-2"
            >
              Continue
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="bg-stone-800 text-stone-100 text-sm font-medium px-6 py-2.5 rounded-full hover:bg-stone-700 transition-colors"
            >
              Post Listing
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
