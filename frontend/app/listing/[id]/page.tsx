"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin, Star, ShieldCheck, MessageCircle, Heart, Share2,
  ChevronLeft, ChevronRight, Flag, Eye, Clock, Package,
  CheckCircle, Phone, Zap, ArrowLeft, Tag, Truck, RotateCcw,
} from "lucide-react";
import { useUser } from "@/utils/UserContext";
import * as listingService from "@/services/listingService";
import { type PostCardProps } from "@/components/post-card";
import { cn } from "@/lib/utils";

// ── All mock listings (mirrors homepage mocks + any saved ones) ───────────────
const ALL_MOCK: PostCardProps[] = [
  {
    id: "1", title: "Casio G-Shock GA-2100", price: 1800, type: "sale",
    category: "electronics", location: "Calamba, Laguna", postedAt: "2h ago",
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=90",
    seller: { name: "Juan dela Cruz", rating: 4.9 },
  },
  {
    id: "2", title: "Studio Unit — Makati CBD", price: 12000, priceUnit: "/ month", type: "rent",
    category: "real-estate", location: "Makati City", postedAt: "1d ago",
    imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=90",
    seller: { name: "Maria Santos", rating: 4.7 },
  },
  {
    id: "3", title: "Aircon Cleaning & Repair", price: 500, priceUnit: "/ unit", type: "service",
    category: "services", location: "San Pablo, Laguna", postedAt: "3h ago",
    imageUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=90",
    seller: { name: "Pedro Reyes", rating: 5.0, isPro: true },
  },
  {
    id: "4", title: "MacBook Pro M2 2023", price: 68000, type: "sale",
    category: "electronics", location: "Quezon City", postedAt: "5h ago",
    imageUrl: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&q=90",
    seller: { name: "Ana Reyes", rating: 4.8 },
  },
  {
    id: "5", title: "Honda Click 125 Scooter", price: 600, priceUnit: "/ day", type: "rent",
    category: "vehicles", location: "Laguna", postedAt: "6h ago",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=90",
    seller: { name: "Carlos M.", rating: 4.6 },
  },
  {
    id: "s1", title: "Casio G-Shock GA-2100", price: 1800, type: "sale",
    category: "electronics", location: "Calamba, Laguna", postedAt: "2h ago",
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=90",
    seller: { name: "You", rating: 4.9 },
  },
  {
    id: "s2", title: "MacBook Pro M1 2022", price: 55000, type: "sale",
    category: "electronics", location: "Calamba, Laguna", postedAt: "1d ago",
    imageUrl: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&q=90",
    seller: { name: "You", rating: 4.9 },
  },
];

// ── Extra detail data keyed by listing id ─────────────────────────────────────
const EXTRA_DETAILS: Record<string, {
  description: string;
  condition: string;
  images: string[];
  tags: string[];
  features: string[];
  views: number;
  offers: number;
}> = {
  "1": {
    description: "Selling my Casio G-Shock GA-2100 in great condition. Used for about 6 months, no scratches on the bezel. All original accessories included. Perfect for everyday wear — shock resistant, water resistant up to 200m. Bought from an authorized dealer.",
    condition: "Like New",
    images: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=90",
      "https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=800&q=90",
      "https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=800&q=90",
    ],
    tags: ["watch", "casio", "g-shock", "waterproof"],
    features: ["Shock Resistant", "Water Resistant 200m", "Solar Power", "Bluetooth"],
    views: 142, offers: 3,
  },
  "4": {
    description: "MacBook Pro M2 2023 14-inch. Space Gray. Purchased Jan 2024, barely used. AppleCare+ until 2026. Battery cycle count only 45. All ports available — HDMI, SD card, MagSafe. Perfect for developers and creators.",
    condition: "Like New",
    images: [
      "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&q=90",
      "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&q=90",
      "https://images.unsplash.com/photo-1611186871525-82fd021f eas?w=800&q=90",
    ],
    tags: ["macbook", "apple", "laptop", "m2"],
    features: ["M2 Pro Chip", "16GB RAM", "512GB SSD", "AppleCare+ 2026"],
    views: 389, offers: 8,
  },
};

function getDefaultExtra(listing: PostCardProps) {
  return {
    description: `${listing.title} available in ${listing.location}. Posted ${listing.postedAt}. Contact the seller for more details about condition and availability.`,
    condition: "Good",
    images: [listing.imageUrl, listing.imageUrl, listing.imageUrl],
    tags: [listing.category ?? "general", listing.type],
    features: [],
    views: Math.floor(Math.random() * 200) + 20,
    offers: Math.floor(Math.random() * 10),
  };
}

const fmt = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 });

const CONDITION_COLORS: Record<string, string> = {
  "Brand New": "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
  "Like New": "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  "Good": "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  "Fair": "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
  "For Parts": "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
};

const TYPE_LABEL: Record<string, string> = { sale: "For Sale", rent: "For Rent", service: "Service" };
const TYPE_COLOR: Record<string, string> = {
  sale: "bg-stone-800 text-stone-100",
  rent: "bg-teal-700 text-white",
  service: "bg-violet-700 text-white",
};

// ── Small related card ────────────────────────────────────────────────────────
function RelatedCard({ listing }: { listing: PostCardProps }) {
  return (
    <Link href={`/listing/${listing.id}`} className="group flex-shrink-0 w-40">
      <div className="bg-white dark:bg-[#1c1f2e] rounded-xl overflow-hidden border border-stone-200 dark:border-[#2a2d3e] hover:-translate-y-1 hover:shadow-md transition-all duration-200">
        <div className="relative aspect-[4/3] overflow-hidden bg-stone-100 dark:bg-[#13151f]">
          <Image src={listing.imageUrl} alt={listing.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="160px" />
          <span className={cn("absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full", TYPE_COLOR[listing.type])}>
            {TYPE_LABEL[listing.type]}
          </span>
        </div>
        <div className="p-2.5">
          <p className="text-stone-800 dark:text-stone-100 font-semibold text-xs leading-tight line-clamp-2">{listing.title}</p>
          <p className="text-stone-800 dark:text-stone-200 font-bold text-sm mt-1">{fmt.format(listing.price)}{listing.priceUnit ? <span className="text-[10px] font-normal text-stone-400 dark:text-stone-500">{listing.priceUnit}</span> : null}</p>
          <p className="text-stone-400 dark:text-stone-500 text-[10px] mt-0.5 truncate">{listing.location}</p>
        </div>
      </div>
    </Link>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isValidated } = useUser();

  const [listing, setListing] = useState<PostCardProps | null>(null);
  const [extra, setExtra] = useState(getDefaultExtra({ id: "", title: "", price: 0, type: "sale", location: "", postedAt: "", imageUrl: "", seller: { name: "" } }));
  const [imgIdx, setImgIdx] = useState(0);
  const [saved, setSaved] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerSent, setOfferSent] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const all = [...ALL_MOCK, ...listingService.getListings()];
    const found = all.find((l) => l.id === id);
    if (found) {
      setListing(found);
      setExtra(EXTRA_DETAILS[id] ?? getDefaultExtra(found));
      setOfferAmount(String(Math.round(found.price * 0.9)));
    }
  }, [id]);

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 dark:bg-[#0f1117]">
        <div className="text-center">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-stone-600 dark:text-stone-400 font-medium">Listing not found</p>
          <Link href="/" className="mt-4 inline-block text-sm text-stone-500 dark:text-stone-400 underline">Back to home</Link>
        </div>
      </div>
    );
  }

  const related = ALL_MOCK.filter((l) => l.id !== id && (l.category === listing.category || l.type === listing.type)).slice(0, 8);
  const isOwnListing = user?.firstName && listing.seller.name === "You";
  const isSeller = listing.type === "sale";
  const isRent = listing.type === "rent";
  const isService = listing.type === "service";

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2500);
  }

  function handleMessage() {
    if (!isValidated) { router.push("/login"); return; }
    router.push(`/messages/${listing.seller.name.replace(/\s+/g, "-").toLowerCase()}`);
  }

  function handleBuy() {
    if (!isValidated) { router.push("/login"); return; }
    setOfferOpen(true);
  }

  function sendOffer() {
    setOfferSent(true);
    setTimeout(() => { setOfferOpen(false); setOfferSent(false); }, 2000);
  }

  const images = extra.images.filter(Boolean);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-[#0f1117] pt-16">

      {/* ── Breadcrumb ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-3">
        <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500">
          <Link href="/" className="hover:text-stone-600 dark:hover:text-stone-300 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Home
          </Link>
          <span>/</span>
          <span className="capitalize text-stone-500 dark:text-stone-400">{listing.category}</span>
          <span>/</span>
          <span className="text-stone-700 dark:text-stone-300 truncate max-w-[180px]">{listing.title}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

          {/* ══ LEFT COLUMN ══════════════════════════════════════════════════ */}
          <div className="flex flex-col gap-5">

            {/* ── Image gallery ── */}
            <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] overflow-hidden shadow-sm">
              {/* Main image */}
              <div className="relative aspect-[16/10] bg-stone-100 dark:bg-[#13151f] overflow-hidden group">
                <Image
                  src={images[imgIdx] ?? listing.imageUrl}
                  alt={listing.title}
                  fill className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  priority
                />
                {/* Type badge */}
                <span className={cn("absolute top-4 left-4 text-xs font-bold px-3 py-1 rounded-full", TYPE_COLOR[listing.type])}>
                  {TYPE_LABEL[listing.type]}
                </span>
                {listing.seller.isPro && (
                  <span className="absolute top-4 left-28 bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full">PRO</span>
                )}
                {/* Condition badge */}
                <span className={cn("absolute top-4 right-4 text-xs font-semibold px-3 py-1 rounded-full", CONDITION_COLORS[extra.condition] ?? CONDITION_COLORS["Good"])}>
                  {extra.condition}
                </span>
                {/* Nav arrows */}
                {images.length > 1 && (
                  <>
                    <button onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 dark:bg-black/50 rounded-full flex items-center justify-center shadow-md hover:bg-white dark:hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100">
                      <ChevronLeft className="w-5 h-5 text-stone-700 dark:text-stone-200" />
                    </button>
                    <button onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 dark:bg-black/50 rounded-full flex items-center justify-center shadow-md hover:bg-white dark:hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100">
                      <ChevronRight className="w-5 h-5 text-stone-700 dark:text-stone-200" />
                    </button>
                  </>
                )}
                {/* Dot indicators */}
                {images.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button key={i} onClick={() => setImgIdx(i)}
                        className={cn("w-1.5 h-1.5 rounded-full transition-all", i === imgIdx ? "bg-white w-4" : "bg-white/50")} />
                    ))}
                  </div>
                )}
              </div>
              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setImgIdx(i)}
                      className={cn("relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                        i === imgIdx ? "border-stone-800 dark:border-stone-300" : "border-transparent opacity-60 hover:opacity-100")}>
                      <Image src={img} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="64px" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Description ── */}
            <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm p-6">
              <h2 className="font-bold text-stone-900 dark:text-stone-50 text-base mb-3">About this listing</h2>
              <p className="text-stone-600 dark:text-stone-300 text-sm leading-relaxed">{extra.description}</p>

              {/* Features */}
              {extra.features.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-3">Highlights</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {extra.features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
                        <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {extra.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-stone-100 dark:border-[#2a2d3e]">
                  {extra.tags.map((t) => (
                    <span key={t} className="flex items-center gap-1 text-xs bg-stone-100 dark:bg-[#252837] text-stone-500 dark:text-stone-400 px-3 py-1 rounded-full">
                      <Tag className="w-2.5 h-2.5" /> {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Policies / info rows ── */}
            <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm divide-y divide-stone-100 dark:divide-[#2a2d3e]">
              {[
                { icon: <MapPin className="w-4 h-4 text-stone-400" />, label: "Pickup location", value: listing.location },
                { icon: <Truck className="w-4 h-4 text-stone-400" />, label: "Meet-up / Delivery", value: isService ? "On-site service" : "Meetup preferred · Delivery negotiable" },
                { icon: <RotateCcw className="w-4 h-4 text-stone-400" />, label: "Returns", value: isService ? "Satisfaction guaranteed" : "No returns — inspect before buying" },
                { icon: <Eye className="w-4 h-4 text-stone-400" />, label: "Listing stats", value: `${extra.views} views · ${extra.offers} offers received` },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="shrink-0">{row.icon}</div>
                  <span className="text-xs text-stone-400 dark:text-stone-500 w-36 shrink-0">{row.label}</span>
                  <span className="text-sm text-stone-700 dark:text-stone-200">{row.value}</span>
                </div>
              ))}
            </div>

            {/* ── Related listings ── */}
            {related.length > 0 && (
              <div>
                <h2 className="font-bold text-stone-900 dark:text-stone-50 text-base mb-3">You might also like</h2>
                <div className="flex gap-3 overflow-x-auto pb-1 no-scroll">
                  {related.map((l) => <RelatedCard key={l.id} listing={l} />)}
                </div>
              </div>
            )}
          </div>

          {/* ══ RIGHT COLUMN — sticky action panel ═══════════════════════════ */}
          <div className="flex flex-col gap-4">
            <div className="lg:sticky lg:top-20">

              {/* ── Price + title card ── */}
              <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm p-5 mb-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50 leading-tight">{listing.title}</h1>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => setSaved((v) => !v)}
                      className={cn("w-9 h-9 rounded-full flex items-center justify-center border transition-all",
                        saved ? "border-rose-200 bg-rose-50 dark:bg-rose-900/30 dark:border-rose-800 text-rose-500" : "border-stone-200 dark:border-[#2a2d3e] text-stone-400 dark:text-stone-500 hover:border-rose-200 hover:text-rose-400")}>
                      <Heart className={cn("w-4 h-4", saved && "fill-rose-500")} />
                    </button>
                    <button onClick={handleShare}
                      className="w-9 h-9 rounded-full flex items-center justify-center border border-stone-200 dark:border-[#2a2d3e] text-stone-400 dark:text-stone-500 hover:border-stone-400 dark:hover:border-stone-500 transition-all">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-3xl font-extrabold text-stone-900 dark:text-stone-50">{fmt.format(listing.price)}</span>
                  {listing.priceUnit && <span className="text-stone-400 dark:text-stone-500 text-sm">{listing.priceUnit}</span>}
                </div>
                {isSeller && (
                  <p className="text-xs text-stone-400 dark:text-stone-500 mb-3">Price is {extra.offers > 2 ? "firm" : "negotiable"} · {extra.offers} offer{extra.offers !== 1 ? "s" : ""} received</p>
                )}

                {/* Location + posted */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400 dark:text-stone-500 mb-4">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{listing.location}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Posted {listing.postedAt}</span>
                </div>

                {/* Quantity (for sale items only) */}
                {isSeller && !isOwnListing && (
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Qty:</span>
                    <div className="flex items-center border border-stone-200 dark:border-[#2a2d3e] rounded-full overflow-hidden">
                      <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-[#252837] transition-colors text-lg leading-none">−</button>
                      <span className="w-8 text-center text-sm font-semibold text-stone-800 dark:text-stone-100">{quantity}</span>
                      <button onClick={() => setQuantity((q) => q + 1)} className="w-8 h-8 flex items-center justify-center text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-[#252837] transition-colors text-lg leading-none">+</button>
                    </div>
                    {quantity > 1 && (
                      <span className="text-xs text-stone-400 dark:text-stone-500">= {fmt.format(listing.price * quantity)}</span>
                    )}
                  </div>
                )}

                {/* ── CTA buttons ── */}
                {isOwnListing ? (
                  <div className="flex flex-col gap-2">
                    <Link href="/create" className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-bold hover:opacity-90 transition-opacity">
                      ✏️ Edit Listing
                    </Link>
                    <button className="flex items-center justify-center gap-2 w-full py-3 rounded-full border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                      🗑 Remove Listing
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {/* Primary action */}
                    {isSeller && (
                      <button onClick={handleBuy}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-full text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                        style={{ background: "linear-gradient(135deg, #1e2433 0%, #3a4a6a 100%)" }}>
                        <Zap className="w-4 h-4" /> Make an Offer
                      </button>
                    )}
                    {isRent && (
                      <button onClick={handleBuy}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-full text-sm font-bold text-white bg-teal-700 hover:bg-teal-600 transition-colors active:scale-[0.98]">
                        <Package className="w-4 h-4" /> Request to Rent
                      </button>
                    )}
                    {isService && (
                      <button onClick={handleBuy}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-full text-sm font-bold text-white bg-violet-700 hover:bg-violet-600 transition-colors active:scale-[0.98]">
                        <CheckCircle className="w-4 h-4" /> Book Service
                      </button>
                    )}

                    {/* Message */}
                    <button onClick={handleMessage}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-full border-2 border-stone-200 dark:border-[#2a2d3e] text-stone-700 dark:text-stone-200 text-sm font-semibold hover:border-stone-400 dark:hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-[#252837] transition-all">
                      <MessageCircle className="w-4 h-4" /> Message Seller
                    </button>

                    {/* Call */}
                    <button className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-stone-500 dark:text-stone-400 text-xs font-medium hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                      onClick={() => !isValidated && router.push("/login")}>
                      <Phone className="w-3.5 h-3.5" /> Show Contact Number
                    </button>
                  </div>
                )}
              </div>

              {/* ── Seller card ── */}
              <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm p-5 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3a4a6a] to-[#1e2a40] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {listing.seller.name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-stone-900 dark:text-stone-50 text-sm">{listing.seller.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {listing.seller.rating && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                          <Star className="w-3 h-3 fill-amber-400" /> {listing.seller.rating.toFixed(1)}
                        </span>
                      )}
                      {listing.seller.isPro && (
                        <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">PRO</span>
                      )}
                      <span className="flex items-center gap-0.5 text-xs text-teal-600 dark:text-teal-400 font-medium">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  {[
                    { label: "Listings", value: "24" },
                    { label: "Response", value: "< 1h" },
                    { label: "Sales",    value: "98%" },
                  ].map((s) => (
                    <div key={s.label} className="bg-stone-50 dark:bg-[#13151f] rounded-xl py-2.5">
                      <p className="text-sm font-bold text-stone-900 dark:text-stone-50">{s.value}</p>
                      <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                <Link href="/profile"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full border border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300 text-xs font-semibold hover:border-stone-400 dark:hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-[#252837] transition-all">
                  View Seller Profile
                </Link>
              </div>

              {/* ── Safety tips ── */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-2">🛡 Safety Tips</p>
                <ul className="flex flex-col gap-1.5">
                  {[
                    "Meet in a safe, public place",
                    "Inspect the item before paying",
                    "Never pay in advance via GCash",
                    "Report suspicious listings",
                  ].map((tip) => (
                    <li key={tip} className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                      <span className="text-amber-400 dark:text-amber-500 mt-0.5 shrink-0">•</span>{tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Report link */}
              <button onClick={() => setReportOpen(true)}
                className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500 hover:text-red-500 dark:hover:text-red-400 transition-colors mt-3 mx-auto">
                <Flag className="w-3 h-3" /> Report this listing
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ OFFER MODAL ══════════════════════════════════════════════════════ */}
      {offerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setOfferOpen(false)}>
          <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-[#1e2433] px-6 py-5">
              <h2 className="text-white font-bold text-lg">
                {isSeller ? "Make an Offer" : isRent ? "Request to Rent" : "Book Service"}
              </h2>
              <p className="text-slate-400 text-sm mt-1 truncate">{listing.title}</p>
            </div>
            <div className="p-6">
              {offerSent ? (
                <div className="text-center py-6">
                  <div className="text-5xl mb-3">🎉</div>
                  <p className="font-bold text-stone-900 dark:text-stone-50 text-lg">
                    {isSeller ? "Offer Sent!" : isRent ? "Request Sent!" : "Booking Sent!"}
                  </p>
                  <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">The seller will respond shortly.</p>
                </div>
              ) : (
                <>
                  {isSeller && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400 mb-2">
                        <span>Your offer</span>
                        <span>Listed at {fmt.format(listing.price)}</span>
                      </div>
                      <div className="flex items-center border-2 border-stone-200 dark:border-[#2a2d3e] rounded-xl overflow-hidden focus-within:border-stone-400 dark:focus-within:border-stone-500 transition-colors">
                        <span className="px-4 text-stone-400 dark:text-stone-500 font-semibold text-sm bg-stone-50 dark:bg-[#13151f] py-3 border-r border-stone-200 dark:border-[#2a2d3e]">₱</span>
                        <input type="number" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)}
                          className="flex-1 px-4 py-3 text-stone-900 dark:text-stone-50 bg-transparent text-sm font-semibold outline-none" />
                      </div>
                      <div className="flex gap-2 mt-2">
                        {[0.9, 0.85, 0.8].map((p) => (
                          <button key={p} onClick={() => setOfferAmount(String(Math.round(listing.price * p)))}
                            className="flex-1 text-xs py-1.5 rounded-full border border-stone-200 dark:border-[#2a2d3e] text-stone-500 dark:text-stone-400 hover:border-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors">
                            {Math.round(p * 100)}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 block">
                      {isSeller ? "Add a message (optional)" : "Your message"}
                    </label>
                    <textarea rows={3} placeholder={
                      isSeller ? "e.g. Can we meetup in SM Calamba on Saturday?"
                      : isRent ? "e.g. I'd like to rent from Aug 1–7. Is it still available?"
                      : "e.g. I need aircon cleaning for 2 units. When are you available?"
                    } className="w-full bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl px-3 py-2.5 text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 outline-none focus:border-stone-400 dark:focus:border-stone-500 resize-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setOfferOpen(false)}
                      className="flex-1 py-3 rounded-full border border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300 text-sm font-semibold hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors">
                      Cancel
                    </button>
                    <button onClick={sendOffer}
                      className="flex-1 py-3 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-bold hover:opacity-90 transition-opacity">
                      Send →
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ REPORT MODAL ═════════════════════════════════════════════════════ */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setReportOpen(false)}>
          <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="font-bold text-stone-900 dark:text-stone-50 text-lg mb-1">Report Listing</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">What's wrong with this listing?</p>
            <div className="flex flex-col gap-2 mb-5">
              {["Scam / Fraud", "Prohibited item", "Fake / Counterfeit", "Wrong category", "Spam / Duplicate", "Other"].map((r) => (
                <button key={r} className="text-left text-sm text-stone-700 dark:text-stone-200 px-4 py-3 rounded-xl border border-stone-200 dark:border-[#2a2d3e] hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 dark:hover:border-red-800 transition-colors">
                  {r}
                </button>
              ))}
            </div>
            <button onClick={() => setReportOpen(false)}
              className="w-full py-2.5 rounded-full border border-stone-200 dark:border-[#2a2d3e] text-stone-500 dark:text-stone-400 text-sm hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Share toast ── */}
      {shareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl whitespace-nowrap">
          🔗 Link copied to clipboard!
        </div>
      )}

      {/* ── Mobile sticky bar ── */}
      {!isOwnListing && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#1c1f2e] border-t border-stone-200 dark:border-[#2a2d3e] px-4 py-3 flex gap-3 shadow-lg">
          <button onClick={handleMessage}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full border-2 border-stone-200 dark:border-[#2a2d3e] text-stone-700 dark:text-stone-200 text-sm font-semibold">
            <MessageCircle className="w-4 h-4" /> Message
          </button>
          <button onClick={handleBuy}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-white text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #1e2433, #3a4a6a)" }}>
            <Zap className="w-4 h-4" />
            {isSeller ? "Offer" : isRent ? "Rent" : "Book"}
          </button>
        </div>
      )}
    </div>
  );
}
