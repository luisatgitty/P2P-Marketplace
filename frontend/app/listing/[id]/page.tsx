"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin, Star, ShieldCheck, MessageCircle, Bookmark, Share2,
  ChevronLeft, ChevronRight, Flag, Eye, Clock, Package,
  CheckCircle, Phone, Zap, ArrowLeft, Truck, CalendarDays,
} from "lucide-react";
import { useUser } from "@/utils/UserContext";
import { addListingBookmark, getListingDetailById, removeListingBookmark } from "@/services/listingDetailService";
import { getUserProfileData } from "@/services/profileService";
import { type PostCardProps } from "@/components/post-card";
import { LoadingPage } from "@/components/loading";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── ExtraDetail — mirrors every field the listing form collects ────────────────
interface ExtraDetail {
  description:    string;
  condition:      string;       // sell only — "Brand New"|"Like New"|"Good"|"Fair"|"For Parts"
  images:         string[];
  features:       string[];     // highlights (up to 8 keywords)
  views:          number;
  offers:         number;
  // Common
  deliveryMethod: string;       // from form's deliveryMethod field
  // Rent-specific
  minPeriod?:     string;
  availability?:  string;
  deposit?:       string;
  amenities?:     string[];
  // Service-specific
  turnaround?:    string;
  serviceArea?:   string;
  inclusions?:    string[];
}

function getDefaultExtra(listing: PostCardProps): ExtraDetail {
  return {
    description:    `${listing.title} available in ${listing.location}. Posted ${listing.postedAt}. Contact the seller for more details.`,
    condition:      listing.type === "sell" ? "Good" : "",
    images:         [listing.imageUrl, listing.imageUrl, listing.imageUrl],
    features:       [],
    views:          Math.floor(Math.random() * 200) + 20,
    offers:         Math.floor(Math.random() * 10),
    deliveryMethod: listing.type === "service" ? "On-site service" : "Meet-up or Delivery",
  };
}

// ── Formatting ─────────────────────────────────────────────────────────────────
const fmt = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 });

// ── Condition badge colours — keys match the form's condition values exactly ───
const CONDITION_COLORS: Record<string, string> = {
  "Brand New": "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
  "Like New":  "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  "Good":      "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  "Fair":      "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
  "For Parts": "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
};

// ── Type badge — keys match PostCardProps.type ("sell" | "rent" | "service") ───
// FIX: was keyed as "sale" which never matched the actual type value "sell"
const TYPE_LABEL: Record<string, string> = {
  sell:    "For Sale",
  rent:    "For Rent",
  service: "Service",
};
const TYPE_COLOR: Record<string, string> = {
  sell:    "bg-stone-800 text-stone-100",
  rent:    "bg-teal-700 text-white",
  service: "bg-violet-700 text-white",
};

// ── Small related card ────────────────────────────────────────────────────────
function RelatedCard({ listing }: { listing: PostCardProps }) {
  return (
    <Link href={`/listing/${listing.id}`} className="group block w-full">
      <div className="bg-white dark:bg-[#1c1f2e] rounded-xl overflow-hidden border border-stone-200 dark:border-[#2a2d3e] hover:-translate-y-1 hover:shadow-md transition-all duration-200">
        <div className="relative aspect-[4/3] overflow-hidden bg-stone-100 dark:bg-[#13151f]">
          <Image
            src={listing.imageUrl} alt={listing.title} fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="160px"
          />
          <span className={cn("absolute top-1.5 left-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full", TYPE_COLOR[listing.type])}>
            {TYPE_LABEL[listing.type]}
          </span>
        </div>
        <div className="p-2.5">
          <p className="text-stone-800 dark:text-stone-100 font-semibold text-sm leading-tight line-clamp-2">{listing.title}</p>
          <p className="text-stone-800 dark:text-stone-200 font-bold text-sm mt-1">
            {fmt.format(listing.price)}
            {listing.priceUnit && (
              <span className="text-[11px] font-normal text-stone-400 dark:text-stone-500"> {listing.priceUnit}</span>
            )}  
          </p>
          <p className="text-stone-400 dark:text-stone-500 text-[11px] mt-0.5 truncate">{listing.location}</p>
        </div>
      </div>
    </Link>
  );
}

// ── Rent info card — shows data from form's "Rental Terms" step ───────────────
function RentInfoCard({ extra }: { extra: ExtraDetail }) {
  const hasData = extra.minPeriod || extra.availability || extra.deposit || extra.amenities?.length;
  if (!hasData) return null;

  return (
    <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm p-6">
      <h2 className="font-bold text-stone-900 dark:text-stone-50 text-base mb-4">Rental Terms</h2>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {extra.minPeriod && (
            <div className="bg-stone-50 dark:bg-[#13151f] rounded-xl p-3">
              <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Min. Period</p>
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{extra.minPeriod}</p>
            </div>
          )}
          {extra.availability && (
            <div className="bg-stone-50 dark:bg-[#13151f] rounded-xl p-3">
              <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Available From</p>
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                {extra.availability}
              </p>
            </div>
          )}
          {extra.deposit && (
            <div className="bg-stone-50 dark:bg-[#13151f] rounded-xl p-3">
              <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Deposit</p>
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{extra.deposit}</p>
            </div>
          )}
        </div>

        {extra.amenities && extra.amenities.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-2.5">Amenities & Features</p>
            <div className="flex flex-wrap gap-1.5">
              {extra.amenities.map((a) => (
                <span key={a} className="flex items-center gap-1 text-xs bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-2.5 py-1 rounded-full font-medium">
                  <CheckCircle className="w-3 h-3 flex-shrink-0" /> {a}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Service info card — shows data from form's "Service Details" step ─────────
function ServiceInfoCard({ extra }: { extra: ExtraDetail }) {
  const hasData = extra.turnaround || extra.serviceArea || extra.inclusions?.filter(Boolean).length;
  if (!hasData) return null;

  return (
    <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm p-6">
      <h2 className="font-bold text-stone-900 dark:text-stone-50 text-base mb-4">Service Details</h2>
      <div className="flex flex-col gap-4">
        {(extra.turnaround || extra.serviceArea) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {extra.turnaround && (
              <div className="bg-stone-50 dark:bg-[#13151f] rounded-xl p-3">
                <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Turnaround</p>
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                  {extra.turnaround}
                </p>
              </div>
            )}
            {extra.serviceArea && (
              <div className="bg-stone-50 dark:bg-[#13151f] rounded-xl p-3">
                <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Service Area</p>
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                  {extra.serviceArea}
                </p>
              </div>
            )}
          </div>
        )}

        {extra.inclusions && extra.inclusions.filter(Boolean).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-2.5">What&apos;s Included</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
              {extra.inclusions.filter(Boolean).map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-stone-700 dark:text-stone-200">
                  <CheckCircle className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ListingDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const { user, isAuth } = useUser();

  const [listing,     setListing]    = useState<PostCardProps | null>(null);
  const [extra,       setExtra]      = useState<ExtraDetail>(
    getDefaultExtra({ id: "", title: "", price: 0, type: "sell", location: "", postedAt: "", imageUrl: "", seller: { name: "", rating: 0 } })
  );
  const [related,     setRelated]    = useState<PostCardProps[]>([]);
  const [isLoading,   setIsLoading]  = useState(true);
  const [imgIdx,      setImgIdx]     = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [offerOpen,   setOfferOpen]  = useState(false);
  const [offerAmount, setOfferAmt]   = useState("");
  const [offerSent,   setOfferSent]  = useState(false);
  const [reportOpen,  setReportOpen] = useState(false);
  const [shownContactNumber, setShownContactNumber] = useState<string | null>(null);
  const [deleting,    setDeleting]   = useState(false);
  const [messaging,   setMessaging]  = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isFetchingContact, setIsFetchingContact] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadListing() {
      setIsLoading(true);
      try {
        const payload = await getListingDetailById(id);
        if (!mounted) return;

        setListing(payload.listing);
        setExtra(payload.extra);
        setRelated(payload.related ?? []);
        setIsBookmarked(Boolean(payload.isBookmarked));
        setShownContactNumber(null);
        setImgIdx(0);
        setOfferAmt(String(Math.round(payload.listing.price * 0.9)));
      } catch {
        if (!mounted) return;
        setListing(null);
        setRelated([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadListing();

    return () => {
      mounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (<LoadingPage />);
  }

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

  const isOwnListing = !!(user?.firstName && `${user.firstName} ${user.lastName}`.trim() === listing.seller.name);
  const isSell       = listing.type === "sell";
  const isRent       = listing.type === "rent";
  const isService    = listing.type === "service";
  const images       = extra.images.filter(Boolean);
  const sellerProfileHref = isOwnListing
    ? "/profile"
    : (listing.seller.id ? `/profile?userId=${listing.seller.id}` : "/profile");

  async function handleShowContactNumber() {
    if (shownContactNumber) {
      setShownContactNumber(null);
      return;
    }

    const showErrorToast = (message: string) => {
      toast.error(message, { position: "top-center" });
    };

    if (isOwnListing) {
      const myMobileNumber = user?.phoneNumber?.trim();
      if (!myMobileNumber) {
        showErrorToast("You do not have a mobile number yet.");
        return;
      }
      setShownContactNumber(myMobileNumber);
      return;
    }

    if (!isAuth) {
      router.push("/login");
      return;
    }

    if ((user?.status ?? "").toLowerCase() !== "verified") {
      router.push("/become-seller");
      return;
    }

    if (!listing?.seller?.id || isFetchingContact) {
      if (!listing?.seller?.id) {
        showErrorToast("Seller contact is unavailable.");
      }
      return;
    }

    setIsFetchingContact(true);
    try {
      const payload = await getUserProfileData(listing.seller.id);
      const sellerMobileNumber = payload.user.phoneNumber?.trim();
      if (!sellerMobileNumber) {
        showErrorToast("Seller does not have a mobile number.");
        return;
      }
      setShownContactNumber(sellerMobileNumber);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to retrieve contact number.";
      showErrorToast(message);
    } finally {
      setIsFetchingContact(false);
    }
  }

  async function handleToggleBookmark() {
    if (!isAuth) {
      router.push("/login");
      return;
    }
    if (!listing || isBookmarking) return;

    setIsBookmarking(true);
    try {
      if (isBookmarked) {
        await removeListingBookmark(listing.id);
        setIsBookmarked(false);
      } else {
        await addListingBookmark(listing.id);
        setIsBookmarked(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update bookmark.";
      window.alert(message);
    } finally {
      setIsBookmarking(false);
    }
  }

  async function handleMessage() {
    if (!isAuth) { router.push("/login"); return; }
    if (!listing || messaging) return;

    setMessaging(true);
    try {
      router.push(`/messages/new?listingId=${listing.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to open conversation.";
      window.alert(message);
    } finally {
      setMessaging(false);
    }
  }

  function handleBuy() {
    if (!isAuth) { router.push("/login"); return; }
    setOfferOpen(true);
  }

  function sendOffer() {
    setOfferSent(true);
    setTimeout(() => { setOfferOpen(false); setOfferSent(false); }, 2000);
  }

  async function handleRemoveListing() {
    if (!isAuth) {
      router.push("/login");
      return;
    }
    if (!isOwnListing || deleting) return;

    const confirmed = window.confirm("Delete this listing permanently? This action cannot be undone.");
    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listing/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const parsedJson = await response.json();
      if (!response.ok) {
        throw new Error(parsedJson?.data?.message || "Failed to remove listing.");
      }

      router.push("/profile");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove listing.";
      window.alert(message);
    } finally {
      setDeleting(false);
    }
  }

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

                {/* Condition badge — sell listings only; rent/service have no condition */}
                {isSell && extra.condition && (
                  <span className={cn(
                    "absolute top-4 right-4 text-xs font-semibold px-3 py-1 rounded-full",
                    CONDITION_COLORS[extra.condition] ?? CONDITION_COLORS["Good"]
                  )}>
                    {extra.condition}
                  </span>
                )}

                {/* Nav arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 dark:bg-black/50 rounded-full flex items-center justify-center shadow-md hover:bg-white dark:hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100">
                      <ChevronLeft className="w-5 h-5 text-stone-700 dark:text-stone-200" />
                    </button>
                    <button
                      onClick={() => setImgIdx((i) => (i + 1) % images.length)}
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
                      className={cn(
                        "relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                        i === imgIdx ? "border-stone-800 dark:border-stone-300" : "border-transparent opacity-60 hover:opacity-100"
                      )}>
                      <Image src={img} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="64px" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Description + Highlights ── */}
            <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm p-6">
              <h2 className="font-bold text-stone-900 dark:text-stone-50 text-base mb-3">About this listing</h2>
              <p className="text-stone-600 dark:text-stone-300 text-sm leading-relaxed">{extra.description}</p>

              {/* Highlights — populated from the form's highlights field (extra.features) */}
              {extra.features.length > 0 && (
                <div className="mt-4 pt-4 border-t border-stone-100 dark:border-[#2a2d3e]">
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
            </div>

            {/* ── Type-specific info cards ── */}
            {isRent    && <RentInfoCard    extra={extra} />}
            {isService && <ServiceInfoCard extra={extra} />}

            {/* ── Listing info rows ── */}
            <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm divide-y divide-stone-100 dark:divide-[#2a2d3e]">
              {[
                {
                  icon:  <MapPin className="w-4 h-4 text-stone-400" />,
                  label: "Location",
                  value: listing.location,
                },
                {
                  icon:  <Truck className="w-4 h-4 text-stone-400" />,
                  label: isService ? "Arrangement" : "Meet-up / Delivery",
                  // Reflects the actual deliveryMethod the seller chose in the form
                  value: extra.deliveryMethod,
                },
                {
                  icon:  <Eye className="w-4 h-4 text-stone-400" />,
                  label: "Listing stats",
                  value: `${extra.views} views · ${extra.offers} ${isService ? "bookings" : "offers"} received`,
                },
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
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {related.map((l) => <RelatedCard key={l.id} listing={l} />)}
                </div>
              </div>
            )}
          </div>

          {/* ══ RIGHT COLUMN ══════════════════════════════════════════════════ */}
          <div className="flex flex-col gap-4">
            <div className="lg:sticky lg:top-20">

              {/* ── Price + title card ── */}
              <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm p-5 mb-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h1 className="text-lg font-bold text-stone-900 dark:text-stone-50 leading-tight">{listing.title}</h1>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={handleToggleBookmark}
                      disabled={isBookmarking}
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center border transition-all disabled:opacity-60 disabled:cursor-not-allowed",
                        isBookmarked
                          ? "border-rose-200 bg-rose-50 dark:bg-rose-900/30 dark:border-rose-800 text-rose-500"
                          : "border-stone-200 dark:border-[#2a2d3e] text-stone-400 dark:text-stone-500 hover:border-rose-200 hover:text-rose-400"
                      )}>
                      <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-rose-500")} />
                    </button>
                    <button
                      onClick={() => toast.info("Link copied to clipboard!", { position: "top-center" })}
                      className="w-9 h-9 rounded-full flex items-center justify-center border border-stone-200 dark:border-[#2a2d3e] text-stone-400 dark:text-stone-500 hover:border-stone-400 dark:hover:border-stone-500 transition-all">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-2xl font-extrabold text-stone-900 dark:text-stone-50">{fmt.format(listing.price)}</span>
                  {listing.priceUnit && <span className="text-stone-400 dark:text-stone-500 text-sm">{listing.priceUnit}</span>}
                </div>

                {/* Location + posted */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-stone-400 dark:text-stone-500 mb-4">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{listing.location}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Posted {listing.postedAt}</span>
                </div>

                {/* ── CTA buttons ── */}
                {isOwnListing ? (
                  <div className="flex flex-col gap-2">
                    {/* FIX: was href="/create" — now correctly routes to the edit form */}
                    <Link
                      href={`/listing/${id}/edit`}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-bold hover:opacity-90 transition-opacity">
                      ✏️ Edit Listing
                    </Link>
                    <button
                      onClick={handleRemoveListing}
                      disabled={deleting}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-full border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      🗑 {deleting ? "Removing..." : "Remove Listing"}
                    </button>
                    <button
                      onClick={handleShowContactNumber}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-stone-500 dark:text-stone-400 text-xs font-medium hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" /> {shownContactNumber ?? "Show My Number"}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {isSell && (
                      <button
                        onClick={handleBuy}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-full text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                        style={{ background: "linear-gradient(135deg, #1e2433 0%, #3a4a6a 100%)" }}>
                        <Zap className="w-4 h-4" /> Make an Offer
                      </button>
                    )}
                    {isRent && (
                      <button
                        onClick={handleBuy}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-full text-sm font-bold text-white bg-teal-700 hover:bg-teal-600 transition-colors active:scale-[0.98]">
                        <Package className="w-4 h-4" /> Request to Rent
                      </button>
                    )}
                    {isService && (
                      <button
                        onClick={handleBuy}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-full text-sm font-bold text-white bg-violet-700 hover:bg-violet-600 transition-colors active:scale-[0.98]">
                        <CheckCircle className="w-4 h-4" /> Book Service
                      </button>
                    )}
                    <button
                      onClick={handleMessage}
                      disabled={messaging}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-full border-2 border-stone-200 dark:border-[#2a2d3e] text-stone-700 dark:text-stone-200 text-sm font-semibold hover:border-stone-400 dark:hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-[#252837] transition-all">
                      <MessageCircle className="w-4 h-4" /> {messaging ? "Opening chat..." : "Message Seller"}
                    </button>
                    <button
                      onClick={handleShowContactNumber}
                      disabled={isFetchingContact}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-stone-500 dark:text-stone-400 text-xs font-medium hover:text-stone-700 dark:hover:text-stone-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                      <Phone className="w-3.5 h-3.5" /> {shownContactNumber ?? (isFetchingContact ? "Loading Number..." : "Show Contact Number")}
                    </button>
                  </div>
                )}
              </div>

              {/* ── Seller card ── */}
              <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm p-5 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <Link href={sellerProfileHref} className="block">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3a4a6a] to-[#1e2a40] flex items-center justify-center text-white font-bold text-lg flex-shrink-0 hover:opacity-90 transition-opacity">
                      {listing.seller.name[0].toUpperCase()}
                    </div>
                  </Link>
                  <div className="min-w-0">
                    <p className="font-bold text-stone-900 dark:text-stone-50 text-md">{listing.seller.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {listing.seller.rating && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                          <Star className="w-3 h-3 fill-amber-400" /> {listing.seller.rating.toFixed(1)}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5 text-xs text-teal-600 dark:text-teal-400 font-medium">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  {[
                    { label: "Listings", value: "24"   },
                    { label: "Response", value: "< 1h" },
                    { label: "Sales",    value: "98%"  },
                  ].map((s) => (
                    <div key={s.label} className="bg-stone-50 dark:bg-[#13151f] rounded-xl py-2.5">
                      <p className="text-sm font-bold text-stone-900 dark:text-stone-50">{s.value}</p>
                      <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                <Link
                  href={sellerProfileHref}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full border border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300 text-sm font-semibold hover:border-stone-400 dark:hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-[#252837] transition-all">
                  {isOwnListing ? "View My Profile" : "View Seller Profile"}
                </Link>
              </div>

              {/* ── Safety tips ── */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-2">🛡 Safety Tips</p>
                <ul className="flex flex-col gap-1.5">
                  {[
                    "Meet in a safe, public place",
                    "Inspect the item before paying",
                    "Never pay in advance via GCash",
                    "Report suspicious listings",
                  ].map((tip) => (
                    <li key={tip} className="flex items-start gap-1.5 text-[12px] text-amber-700 dark:text-amber-400">
                      <span className="text-amber-400 dark:text-amber-500 mt-0.5 shrink-0">•</span>{tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Report link */}
              <button
                onClick={() => setReportOpen(true)}
                className="flex items-center gap-1.5 text-sm text-stone-400 dark:text-stone-500 hover:text-red-500 dark:hover:text-red-400 transition-colors mt-3 mx-auto">
                <Flag className="w-3 h-3" /> Report this listing
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ OFFER MODAL ══════════════════════════════════════════════════════ */}
      {offerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setOfferOpen(false)}>
          <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-[#1e2433] px-6 py-5">
              <h2 className="text-white font-bold text-lg">
                {isSell ? "Make an Offer" : isRent ? "Request to Rent" : "Book Service"}
              </h2>
              <p className="text-slate-400 text-sm mt-1 truncate">{listing.title}</p>
            </div>
            <div className="p-6">
              {offerSent ? (
                <div className="text-center py-6">
                  <div className="text-5xl mb-3">🎉</div>
                  <p className="font-bold text-stone-900 dark:text-stone-50 text-lg">
                    {isSell ? "Offer Sent!" : isRent ? "Request Sent!" : "Booking Sent!"}
                  </p>
                  <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">The seller will respond shortly.</p>
                </div>
              ) : (
                <>
                  {isSell && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400 mb-2">
                        <span>Your offer</span>
                        <span>Listed at {fmt.format(listing.price)}</span>
                      </div>
                      <div className="flex items-center border-2 border-stone-200 dark:border-[#2a2d3e] rounded-xl overflow-hidden focus-within:border-stone-400 dark:focus-within:border-stone-500 transition-colors">
                        <span className="px-4 text-stone-400 dark:text-stone-500 font-semibold text-sm bg-stone-50 dark:bg-[#13151f] py-3 border-r border-stone-200 dark:border-[#2a2d3e]">₱</span>
                        <input
                          type="number" value={offerAmount}
                          onChange={(e) => setOfferAmt(e.target.value)}
                          className="flex-1 px-4 py-3 text-stone-900 dark:text-stone-50 bg-transparent text-sm font-semibold outline-none"
                        />
                      </div>
                      <div className="flex gap-2 mt-2">
                        {[0.9, 0.85, 0.8].map((p) => (
                          <button key={p}
                            onClick={() => setOfferAmt(String(Math.round(listing.price * p)))}
                            className="flex-1 text-xs py-1.5 rounded-full border border-stone-200 dark:border-[#2a2d3e] text-stone-500 dark:text-stone-400 hover:border-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors">
                            {Math.round(p * 100)}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 block">
                      {isSell ? "Add a message (optional)" : "Your message"}
                    </label>
                    <textarea
                      rows={3}
                      placeholder={
                        isSell    ? "e.g. Can we meet up in SM Calamba on Saturday?"        :
                        isRent    ? "e.g. I'd like to rent from Aug 1–7. Still available?"  :
                                    "e.g. I need aircon cleaning for 2 units. When are you available?"
                      }
                      className="w-full bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl px-3 py-2.5 text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 outline-none focus:border-stone-400 dark:focus:border-stone-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOfferOpen(false)}
                      className="flex-1 py-3 rounded-full border border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300 text-sm font-semibold hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors">
                      Cancel
                    </button>
                    <button
                      onClick={sendOffer}
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

      {/* ══ REPORT MODAL ══════════════════════════════════════════════════════ */}
      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setReportOpen(false)}>
          <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="font-bold text-stone-900 dark:text-stone-50 text-lg mb-1">Report Listing</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">What&apos;s wrong with this listing?</p>
            <div className="flex flex-col gap-2 mb-5">
              {["Scam / Fraud", "Prohibited item", "Fake / Counterfeit", "Wrong category", "Spam / Duplicate", "Other"].map((r) => (
                <button key={r}
                  className="text-left text-sm text-stone-700 dark:text-stone-200 px-4 py-3 rounded-xl border border-stone-200 dark:border-[#2a2d3e] hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 dark:hover:border-red-800 transition-colors">
                  {r}
                </button>
              ))}
            </div>
            <button
              onClick={() => setReportOpen(false)}
              className="w-full py-2.5 rounded-full border border-stone-200 dark:border-[#2a2d3e] text-stone-500 dark:text-stone-400 text-sm hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile sticky bar ── */}
      {!isOwnListing && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#1c1f2e] border-t border-stone-200 dark:border-[#2a2d3e] px-4 py-3 flex gap-3 shadow-lg">
          <button
            onClick={handleMessage}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full border-2 border-stone-200 dark:border-[#2a2d3e] text-stone-700 dark:text-stone-200 text-sm font-semibold">
            <MessageCircle className="w-4 h-4" /> Message
          </button>
          <button
            onClick={handleBuy}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-white text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #1e2433, #3a4a6a)" }}>
            <Zap className="w-4 h-4" />
            {isSell ? "Offer" : isRent ? "Rent" : "Book"}
          </button>
        </div>
      )}
    </div>
  );
}
