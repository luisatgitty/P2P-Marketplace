"use client";

import { useState } from "react";
import Link from "next/link";
import { use } from "react";
import {
  MapPin, Clock, Eye, Star, Bookmark, BookmarkCheck,
  MessageCircle, ChevronLeft, ChevronRight, Share2,
  ShieldCheck, Truck, CalendarDays, CheckCircle2,
  AlertCircle, Phone, BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getListingById, TYPE_CONFIG, type ListingDetail, type ListingType } from "@/lib/listing-data";

// ─── Helpers ────────────────────────────────────────────────────────────────────
const formatPrice = (p: number) =>
  "₱" + p.toLocaleString("en-PH", { minimumFractionDigits: 0 });

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(rating) ? "text-amber-500" : "text-stone-300 dark:text-stone-600"}
          fill={i <= Math.round(rating) ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

// ─── Image Gallery ──────────────────────────────────────────────────────────────
function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);

  const prev = () => setActive((a) => (a - 1 + images.length) % images.length);
  const next = () => setActive((a) => (a + 1) % images.length);

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative rounded-2xl overflow-hidden bg-stone-100 dark:bg-[#151f2e] aspect-[4/3]">
        <img
          src={images[active]}
          alt={`${title} — photo ${active + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
        {/* Nav arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
              aria-label="Next image"
            >
              <ChevronRight size={18} />
            </button>
            <span className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
              {active + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all",
                i === active
                  ? "border-amber-600 opacity-100 scale-100"
                  : "border-transparent opacity-60 hover:opacity-90"
              )}
            >
              <img src={src} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Seller Card ────────────────────────────────────────────────────────────────
function SellerCard({
  seller, cfg, onMessage,
}: {
  seller: ListingDetail["seller"];
  cfg: typeof TYPE_CONFIG[ListingType];
  onMessage: () => void;
}) {
  return (
    <div className={cn(
      "rounded-2xl border p-4 sm:p-5 flex flex-col gap-4",
      "bg-white dark:bg-[#1e2a3a]",
      cfg.accentBorder
    )}>
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className={cn(
          "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0 border-2",
          cfg.accentBorder,
          "bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200"
        )}>
          {seller.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-stone-800 dark:text-stone-100 text-sm">
              {seller.name}
            </span>
            {seller.verified && (
              <BadgeCheck size={14} className={cfg.accentCls} />
            )}
            {seller.isPro && (
              <span className="text-[9px] font-extrabold bg-amber-500 text-white px-1.5 py-0.5 rounded-md tracking-wider">
                PRO
              </span>
            )}
          </div>
          <StarRating rating={seller.rating} size={12} />
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {seller.reviewCount} reviews · Member since {seller.memberSince}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className={cn("grid grid-cols-2 gap-2 rounded-xl p-3 text-center text-xs", cfg.accentBg)}>
        <div>
          <p className={cn("font-bold text-sm", cfg.accentCls)}>{seller.responseTime}</p>
          <p className="text-stone-500 dark:text-stone-400">Avg. response</p>
        </div>
        <div>
          <p className={cn("font-bold text-sm", cfg.accentCls)}>{seller.totalListings}</p>
          <p className="text-stone-500 dark:text-stone-400">Active listings</p>
        </div>
      </div>

      {/* CTA buttons */}
      <Button
        onClick={onMessage}
        className={cn("w-full rounded-xl text-sm font-semibold py-2.5", cfg.accentBtnCls)}
      >
        <MessageCircle size={15} className="mr-2" /> Message Seller
      </Button>
      <Button variant="outline" className="w-full rounded-xl text-sm border-stone-200 dark:border-white/15">
        <Phone size={15} className="mr-2" /> View Contact Info
      </Button>
    </div>
  );
}

// ─── Trust badges ────────────────────────────────────────────────────────────────
function TrustBadges({ type }: { type: ListingType }) {
  const items =
    type === "sell"
      ? [
          { icon: Truck,       text: "Meet-up or shipping available"     },
          { icon: ShieldCheck, text: "Inspect before payment"            },
          { icon: AlertCircle, text: "Report suspicious listings"        },
        ]
      : type === "rent"
      ? [
          { icon: ShieldCheck, text: "Verified landlord"                 },
          { icon: CalendarDays, text: "Flexible lease terms"             },
          { icon: AlertCircle,  text: "Always inspect before signing"    },
        ]
      : [
          { icon: CheckCircle2, text: "Pro-verified service provider"    },
          { icon: ShieldCheck,  text: "7-day workmanship warranty"       },
          { icon: AlertCircle,  text: "Pay only after completion"        },
        ];

  return (
    <ul className="flex flex-col gap-2 text-xs text-stone-500 dark:text-stone-400">
      {items.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-2">
          <Icon size={13} className="text-stone-400 shrink-0" />
          {text}
        </li>
      ))}
    </ul>
  );
}

// ─── Reviews ─────────────────────────────────────────────────────────────────────
function ReviewSection({ reviews }: { reviews: ListingDetail["reviews"] }) {
  return (
    <div className="flex flex-col gap-4">
      {reviews.map((rev) => (
        <div
          key={rev.id}
          className="flex gap-3 p-4 rounded-xl bg-stone-50 dark:bg-[#151f2e] border border-stone-100 dark:border-white/5"
        >
          <div className="w-9 h-9 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-sm font-bold text-stone-600 dark:text-stone-200 shrink-0">
            {rev.author.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">{rev.author}</span>
                {rev.verified && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">✓ Verified</span>
                )}
              </div>
              <span className="text-xs text-stone-400">{rev.date}</span>
            </div>
            <StarRating rating={rev.rating} size={11} />
            <p className="text-sm text-stone-600 dark:text-stone-400 mt-1.5 leading-relaxed">{rev.comment}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
//  TYPE-SPECIFIC DETAIL PANELS
// ─────────────────────────────────────────────────────────────────────────────────

function SellDetailPanel({ listing, cfg }: { listing: ListingDetail; cfg: typeof TYPE_CONFIG[ListingType] }) {
  return (
    <div className={cn("rounded-2xl border p-4 sm:p-5", cfg.accentBg, cfg.accentBorder)}>
      <h3 className={cn("text-xs font-bold uppercase tracking-widest mb-3", cfg.accentCls)}>
        🏷️ Listing Details
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <p className="text-xs text-stone-500 dark:text-stone-400">Condition</p>
          <p className="font-semibold text-stone-800 dark:text-stone-100">{listing.condition}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 dark:text-stone-400">Category</p>
          <p className="font-semibold text-stone-800 dark:text-stone-100">{listing.category}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 dark:text-stone-400">Delivery</p>
          <p className="font-semibold text-stone-800 dark:text-stone-100">{listing.deliveryMethod}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 dark:text-stone-400">Location</p>
          <p className="font-semibold text-stone-800 dark:text-stone-100">{listing.location}</p>
        </div>
      </div>
    </div>
  );
}

function RentDetailPanel({ listing, cfg }: { listing: ListingDetail; cfg: typeof TYPE_CONFIG[ListingType] }) {
  return (
    <div className={cn("rounded-2xl border p-4 sm:p-5", cfg.accentBg, cfg.accentBorder)}>
      <h3 className={cn("text-xs font-bold uppercase tracking-widest mb-3", cfg.accentCls)}>
        🏡 Rental Terms
      </h3>
      <div className="flex flex-col gap-2.5 text-sm">
        {[
          { label: "Availability",    value: listing.availability    },
          { label: "Minimum Period",  value: listing.minRentalPeriod },
          { label: "Deposit",         value: listing.deposit         },
          { label: "Location",        value: listing.locationFull    },
        ].map(({ label, value }) =>
          value ? (
            <div key={label} className="flex items-start justify-between gap-4">
              <span className="text-xs text-stone-500 dark:text-stone-400 shrink-0">{label}</span>
              <span className="font-semibold text-stone-800 dark:text-stone-100 text-right">{value}</span>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

function ServiceDetailPanel({ listing, cfg }: { listing: ListingDetail; cfg: typeof TYPE_CONFIG[ListingType] }) {
  return (
    <div className={cn("rounded-2xl border p-4 sm:p-5", cfg.accentBg, cfg.accentBorder)}>
      <h3 className={cn("text-xs font-bold uppercase tracking-widest mb-3", cfg.accentCls)}>
        ⚙️ Service Details
      </h3>
      <div className="flex flex-col gap-2.5 text-sm mb-3">
        {[
          { label: "Turnaround",   value: listing.turnaround   },
          { label: "Service Area", value: listing.serviceArea  },
        ].map(({ label, value }) =>
          value ? (
            <div key={label} className="flex items-start justify-between gap-4">
              <span className="text-xs text-stone-500 dark:text-stone-400 shrink-0">{label}</span>
              <span className="font-semibold text-stone-800 dark:text-stone-100 text-right">{value}</span>
            </div>
          ) : null
        )}
      </div>
      {listing.includes && listing.includes.length > 0 && (
        <>
          <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">What&apos;s Included</p>
          <ul className="flex flex-col gap-1.5">
            {listing.includes.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-stone-700 dark:text-stone-300">
                <CheckCircle2 size={13} className={cn("mt-0.5 shrink-0", cfg.accentCls)} />
                {item}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
//  MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ListingDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const listing = getListingById(id);
  const cfg     = TYPE_CONFIG[listing.type];

  const [bookmarked, setBookmarked] = useState(false);
  const [msgOpen,    setMsgOpen]    = useState(false);
  const [msgText,    setMsgText]    = useState("");
  const [msgSent,    setMsgSent]    = useState(false);

  const handleSendMessage = () => {
    if (!msgText.trim()) return;
    // TODO: wire to real API
    setMsgSent(true);
    setTimeout(() => { setMsgOpen(false); setMsgSent(false); setMsgText(""); }, 1800);
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#111827]">

      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 flex-wrap">
        <Link href="/" className="hover:text-stone-700 dark:hover:text-stone-200 transition-colors">Home</Link>
        <ChevronRight size={12} />
        <Link href={`/?type=${listing.type}`} className="hover:text-stone-700 dark:hover:text-stone-200 transition-colors capitalize">
          {cfg.label}
        </Link>
        <ChevronRight size={12} />
        <span className="text-stone-400">{listing.category}</span>
        <ChevronRight size={12} />
        <span className="text-stone-600 dark:text-stone-300 font-medium truncate max-w-[200px]">{listing.title}</span>
      </div>

      {/* ── Type accent bar ──────────────────────────────────────────────────── */}
      <div className={cn(
        "border-b",
        listing.type === "sell"    && "bg-blue-600   border-blue-700",
        listing.type === "rent"    && "bg-emerald-600 border-emerald-700",
        listing.type === "service" && "bg-violet-600  border-violet-700",
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-3">
          <span className="text-xs font-extrabold text-white uppercase tracking-widest">
            {cfg.icon} {cfg.label}
          </span>
          <span className="text-white/60 text-xs">·</span>
          <span className="text-white/70 text-xs">{listing.category}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 lg:gap-8 items-start">

          {/* ────────────── LEFT COLUMN ──────────────────────────────────────── */}
          <div className="flex flex-col gap-6">

            {/* Gallery */}
            <ImageGallery images={listing.images} title={listing.title} />

            {/* — Mobile: title + price block (shown above specs on small screens) — */}
            <div className="lg:hidden bg-white dark:bg-[#1e2a3a] rounded-2xl border border-stone-200 dark:border-white/10 p-4">
              <MobileTitlePrice listing={listing} cfg={cfg} bookmarked={bookmarked} setBookmarked={setBookmarked} />
            </div>

            {/* Type-specific detail panel (mobile) */}
            <div className="lg:hidden">
              {listing.type === "sell"    && <SellDetailPanel    listing={listing} cfg={cfg} />}
              {listing.type === "rent"    && <RentDetailPanel    listing={listing} cfg={cfg} />}
              {listing.type === "service" && <ServiceDetailPanel listing={listing} cfg={cfg} />}
            </div>

            {/* Seller (mobile) */}
            <div className="lg:hidden">
              <SellerCard seller={listing.seller} cfg={cfg} onMessage={() => setMsgOpen(true)} />
            </div>

            {/* Description */}
            <section className="bg-white dark:bg-[#1e2a3a] rounded-2xl border border-stone-200 dark:border-white/10 p-5 sm:p-6">
              <h2 className="text-base font-bold text-stone-800 dark:text-stone-100 mb-3">
                {listing.type === "service" ? "About This Service" : "Item Description"}
              </h2>
              <div className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed whitespace-pre-line">
                {listing.description}
              </div>
            </section>

            {/* Specs table */}
            <section className="bg-white dark:bg-[#1e2a3a] rounded-2xl border border-stone-200 dark:border-white/10 p-5 sm:p-6">
              <h2 className="text-base font-bold text-stone-800 dark:text-stone-100 mb-4">
                {listing.type === "service" ? "Service Specifications" : listing.type === "rent" ? "Property Details" : "Item Specifications"}
              </h2>
              <table className="w-full text-sm border-collapse">
                <tbody>
                  {listing.specs.map(({ label, value }, i) => (
                    <tr
                      key={label}
                      className={cn(
                        "border-b border-stone-100 dark:border-white/5 last:border-0",
                        i % 2 === 0 ? "bg-stone-50/50 dark:bg-white/[0.02]" : ""
                      )}
                    >
                      <td className="py-2.5 px-3 text-stone-500 dark:text-stone-400 font-medium w-2/5 rounded-l-lg">{label}</td>
                      <td className="py-2.5 px-3 text-stone-700 dark:text-stone-200 rounded-r-lg">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Reviews */}
            <section className="bg-white dark:bg-[#1e2a3a] rounded-2xl border border-stone-200 dark:border-white/10 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">
                  Reviews
                  <span className="ml-2 text-sm font-normal text-stone-400">({listing.seller.reviewCount})</span>
                </h2>
                <div className="flex items-center gap-1.5">
                  <StarRating rating={listing.seller.rating} size={14} />
                  <span className="text-sm font-bold text-stone-700 dark:text-stone-200">{listing.seller.rating.toFixed(1)}</span>
                </div>
              </div>
              <ReviewSection reviews={listing.reviews} />
              <button className={cn("mt-4 text-sm font-semibold", cfg.accentCls, "hover:underline")}>
                View all {listing.seller.reviewCount} reviews →
              </button>
            </section>
          </div>

          {/* ────────────── RIGHT COLUMN (desktop sticky) ────────────────────── */}
          <div className="hidden lg:flex flex-col gap-4 sticky top-[76px]">

            {/* Title + price card */}
            <div className="bg-white dark:bg-[#1e2a3a] rounded-2xl border border-stone-200 dark:border-white/10 p-5">
              <DesktopTitlePrice listing={listing} cfg={cfg} bookmarked={bookmarked} setBookmarked={setBookmarked} />
            </div>

            {/* Type-specific panel */}
            {listing.type === "sell"    && <SellDetailPanel    listing={listing} cfg={cfg} />}
            {listing.type === "rent"    && <RentDetailPanel    listing={listing} cfg={cfg} />}
            {listing.type === "service" && <ServiceDetailPanel listing={listing} cfg={cfg} />}

            {/* Seller */}
            <SellerCard seller={listing.seller} cfg={cfg} onMessage={() => setMsgOpen(true)} />

            {/* Trust badges */}
            <div className="bg-white dark:bg-[#1e2a3a] rounded-2xl border border-stone-100 dark:border-white/8 p-4">
              <TrustBadges type={listing.type} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Message Modal ────────────────────────────────────────────────────── */}
      {msgOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setMsgOpen(false)}
        >
          <div className="w-full sm:max-w-md bg-white dark:bg-[#1e2a3a] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-800 dark:text-stone-100 text-base">
                Message {listing.seller.name}
              </h3>
              <button
                onClick={() => setMsgOpen(false)}
                className="text-stone-400 hover:text-stone-600 transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Listing snippet */}
            <div className={cn("flex gap-3 rounded-xl p-3 border", cfg.accentBg, cfg.accentBorder)}>
              <img
                src={listing.images[0]}
                alt={listing.title}
                className="w-12 h-12 rounded-lg object-cover shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-200 line-clamp-1">{listing.title}</p>
                <p className={cn("text-sm font-bold mt-0.5", cfg.accentCls)}>{formatPrice(listing.price)}{listing.priceUnit ? ` ${listing.priceUnit}` : ""}</p>
              </div>
            </div>

            {msgSent ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <CheckCircle2 size={32} className="text-emerald-500" />
                <p className="font-semibold text-stone-800 dark:text-stone-100">Message sent!</p>
                <p className="text-sm text-stone-500">You&apos;ll be notified when they reply.</p>
              </div>
            ) : (
              <>
                <textarea
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  placeholder={`Hi ${listing.seller.name.split(" ")[0]}, is this still available?`}
                  rows={4}
                  className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#151f2e] text-sm text-stone-700 dark:text-stone-300 px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-stone-400"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setMsgOpen(false)}
                    className="flex-1 rounded-xl border-stone-200 dark:border-white/15"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!msgText.trim()}
                    className={cn("flex-1 rounded-xl font-semibold", cfg.accentBtnCls, "disabled:opacity-40")}
                  >
                    <MessageCircle size={15} className="mr-1.5" /> Send
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Title + Price — Mobile ──────────────────────────────────────────────────────
function MobileTitlePrice({
  listing, cfg, bookmarked, setBookmarked,
}: {
  listing: ListingDetail;
  cfg: typeof TYPE_CONFIG[ListingType];
  bookmarked: boolean;
  setBookmarked: (v: boolean) => void;
}) {
  return (
    <TitlePriceContent listing={listing} cfg={cfg} bookmarked={bookmarked} setBookmarked={setBookmarked} />
  );
}

// ─── Title + Price — Desktop ─────────────────────────────────────────────────────
function DesktopTitlePrice({
  listing, cfg, bookmarked, setBookmarked,
}: {
  listing: ListingDetail;
  cfg: typeof TYPE_CONFIG[ListingType];
  bookmarked: boolean;
  setBookmarked: (v: boolean) => void;
}) {
  return (
    <TitlePriceContent listing={listing} cfg={cfg} bookmarked={bookmarked} setBookmarked={setBookmarked} />
  );
}

// ─── Shared Title + Price Content ────────────────────────────────────────────────
function TitlePriceContent({
  listing, cfg, bookmarked, setBookmarked,
}: {
  listing: ListingDetail;
  cfg: typeof TYPE_CONFIG[ListingType];
  bookmarked: boolean;
  setBookmarked: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-stone-800 dark:text-stone-100 leading-snug flex-1">
          {listing.title}
        </h1>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setBookmarked(!bookmarked)}
            className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-white/10 transition-colors"
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
          >
            {bookmarked
              ? <BookmarkCheck size={18} className="text-amber-600" fill="currentColor" />
              : <Bookmark size={18} className="text-stone-500 dark:text-stone-400" />
            }
          </button>
          <button
            className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Share listing"
          >
            <Share2 size={16} className="text-stone-500 dark:text-stone-400" />
          </button>
        </div>
      </div>

      {/* Rating row */}
      <div className="flex items-center gap-2 flex-wrap">
        <StarRating rating={listing.seller.rating} />
        <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">{listing.seller.rating.toFixed(1)}</span>
        <span className="text-stone-300 dark:text-stone-600 text-sm">·</span>
        <span className="text-sm text-stone-500 dark:text-stone-400">{listing.seller.reviewCount} reviews</span>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-1.5">
        <span className={cn("text-2xl sm:text-3xl font-extrabold", cfg.accentCls)}>
          {formatPrice(listing.price)}
        </span>
        {listing.priceUnit && (
          <span className="text-sm text-stone-400 dark:text-stone-500">{listing.priceUnit}</span>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-3 text-xs text-stone-500 dark:text-stone-400 border-t border-stone-100 dark:border-white/8 pt-3">
        <span className="flex items-center gap-1">
          <MapPin size={11} /> {listing.locationFull}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={11} /> Posted {listing.postedAt}
        </span>
        <span className="flex items-center gap-1">
          <Eye size={11} /> {listing.views} views
        </span>
      </div>
    </div>
  );
}
