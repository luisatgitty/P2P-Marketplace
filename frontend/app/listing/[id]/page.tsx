"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin, Star, MessageCircle, Bookmark, Share2,
  ChevronLeft, ChevronRight, Flag, Eye, Clock, Package,
  CheckCircle, Phone, Zap, ArrowLeft, Truck, AlertTriangle
} from "lucide-react";
import { useUser } from "@/utils/UserContext";
import { addListingBookmark, deleteListing, getListingDetailById, removeListingBookmark, submitListingReport } from "@/services/listingDetailService";
import { getUserProfileData } from "@/services/profileService";
import PostCard, { type PostCardProps } from "@/components/post-card";
import ListingTypeBadge from "@/components/listing-type-badge";
import ListingConditionBadge from "@/components/listing-condition-badge";
import VerificationBadge from "@/components/verification-badge";
import { LoadingPage } from "@/components/loading";
import { ScheduleModal } from "@/components/schedule-modal";
import { ReportModal } from "@/components/report-modal";
import OfferModal from "@/components/offer-modal";
import { openOrCreateConversationFromListing } from "@/services/messagingService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/ui/safe-image";
import { ImageLink } from "@/components/image-link";
import { formatPrice, formatTimeAgo } from "@/utils/string-builder";

// ── ExtraDetail — mirrors every field the listing form collects ────────────────
interface ExtraDetail {
  description:    string;
  condition:      string;       // sell only — "Brand New"|"Like New"|"Good"|"Fair"|"For Parts"
  images:         string[];
  features:       string[];     // highlights (up to 8 keywords)
  transactionCount: number;
  reviewCount:    number;
  // Common
  deliveryMethod: string;       // from form's deliveryMethod field
  // Rent-specific
  minPeriod?:     string;
  available_from?: string;
  availability?:  string;
  deposit?:       string;
  amenities?:     string[];
  daysOff?:       string[];
  timeWindows?:   { startTime: string; endTime: string }[];
  // Service-specific
  turnaround?:    string;
  serviceArea?:   string;
  arrangement?:   string;
  inclusions?:    string[];
}

function getDefaultExtra(listing: PostCardProps): ExtraDetail {
  return {
    description:    `${listing.title} available in ${listing.location}. Posted ${listing.postedAt}. Contact the seller for more details.`,
    condition:      listing.type === "sell" ? "Good" : "",
    images:         [listing.imageUrl, listing.imageUrl, listing.imageUrl],
    features:       [],
    transactionCount: 0,
    reviewCount:    0,
    deliveryMethod: listing.type === "service" ? "On-site service" : "Meet-up or Delivery",
    daysOff:        [],
    timeWindows:    [],
    arrangement:    "",
  };
}

// ── Type badge — keys match PostCardProps.type ("sell" | "rent" | "service") ───
// FIX: was keyed as "sale" which never matched the actual type value "sell"
const TYPE_LABEL: Record<string, string> = {
  sell:    "For Sale",
  rent:    "For Rent",
  service: "Service",
};

// ── Rent info card — shows data from form's "Rental Terms" step ───────────────
function RentInfoCard({ extra }: { extra: ExtraDetail }) {
  const hasData = extra.minPeriod || extra.availability || extra.deposit || extra.amenities?.length;
  if (!hasData) return null;

  return (
    <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm p-6">
      <h2 className="font-bold text-stone-900 dark:text-stone-50 text-base mb-4">Rental Terms</h2>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {extra.minPeriod && (
            <div className="bg-stone-50 dark:bg-[#13151f] rounded-xl p-3">
              <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Min. Period</p>
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{extra.minPeriod}</p>
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
                  <CheckCircle className="w-3 h-3 shrink-0" /> {a}
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
                  <Clock className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                  {extra.turnaround}
                </p>
              </div>
            )}
            {extra.serviceArea && (
              <div className="bg-stone-50 dark:bg-[#13151f] rounded-xl p-3">
                <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Service Area</p>
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-violet-500 shrink-0" />
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
                  <CheckCircle className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
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
  const { user, isAuth, isUserOnline } = useUser();

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
  const [offerMessage, setOfferMessage] = useState("");
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [scheduleOpen,  setScheduleOpen]  = useState(false);
  const [reportOpen,  setReportOpen] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
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
  const listingStatus = (listing.status ?? "").trim().toLowerCase();
  const listingSellStatus = (listing.sellStatus ?? "").trim().toLowerCase();
  const isUnavailableState = listingStatus === "unavailable";
  const isBannedState = listingStatus === "banned";
  const isDeletedState = listingStatus === "deleted";
  const isSellerInactiveState = listing.seller.isActive === false;
  const ownerUnavailableState = isUnavailableState || isDeletedState;
  const visitorUnavailableState = isUnavailableState || isBannedState || isDeletedState || isSellerInactiveState;
  const isSold = isSell && (listingStatus === "sold" || listingSellStatus === "sold");
  const images       = extra.images.filter(Boolean);
  const sellerRating = Number.isFinite(listing.seller.rating) ? Number(listing.seller.rating) : 0;
  const hasSellerRating = sellerRating > 0;
  const sellerProfileHref = isOwnListing
    ? "/profile"
    : (listing.seller.id ? `/profile?userId=${listing.seller.id}` : "/profile");
  const sellerOnline = listing.seller.id ? isUserOnline(listing.seller.id) : false;

  function handleCloseReportModal() {
    setReportOpen(false);
  }

  async function handleSubmitReport(payload: { reason: string; description: string }) {
    if (!isAuth) {
      router.push("/login");
      return;
    }

    if (submittingReport) return;

    setSubmittingReport(true);
    try {
      await submitListingReport(id, payload.reason, payload.description);
      toast.success("Report submitted. Thank you for helping keep the community safe.", { position: "top-center" });
      handleCloseReportModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err || "Failed to submit report.");
      toast.error(message, { position: "top-center" });
    } finally {
      setSubmittingReport(false);
    }
  }

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
    if (isRent)    { setScheduleOpen(true);  return; }
    if (isService) { setScheduleOpen(true);  return; }
    setOfferOpen(true); // sell — unchanged
  }

  async function sendOffer() {
    if (!listing || submittingOffer) return;
    if (!isAuth) {
      router.push("/login");
      return; 
    }

    const parsedOffer = Number.parseInt(String(offerAmount), 10);
    if (!Number.isFinite(parsedOffer) || parsedOffer <= 0) {
      toast.error("Please enter a valid offer amount.", { position: "top-center" });
      return;
    }

    setSubmittingOffer(true);
    try {
      const conversationId = await openOrCreateConversationFromListing(listing.id, parsedOffer, offerMessage);
      setOfferMessage("");
      setOfferOpen(false);
      router.push(`/messages/${conversationId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send offer.";
      toast.error(message, { position: "top-center" });
    } finally {
      setSubmittingOffer(false);
    }
  }

  async function sendSchedule(payload: {
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    message: string;
  }) {
    if (!listing) return;
    if (!isAuth) {
      router.push("/login");
      return;
    }

    try {
      const conversationId = await openOrCreateConversationFromListing(listing.id, undefined, undefined, {
        startDate: payload.startDate,
        endDate: payload.endDate,
        startTime: payload.startTime,
        endTime: payload.endTime,
        message: payload.message,
      });
      setScheduleOpen(false);
      router.push(`/messages/${conversationId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to request schedule.";
      toast.error(message, { position: "top-center" });
      throw err;
    }
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
      await deleteListing(id);

      router.push("/profile");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove listing.";
      window.alert(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-[#0f1117]">

      {/* ── Breadcrumb ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-3">
        <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500">
          <Link href="/" className="hover:text-stone-600 dark:hover:text-stone-300 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Home
          </Link>
          <span>/</span>
          <Link
            href={`/?type=${listing.type}`}
            className="hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
          >
            {TYPE_LABEL[listing.type]}
          </Link>
          <span>/</span>
          <span className="capitalize text-stone-500 dark:text-stone-400">{listing.category}</span>
          <span>/</span>
          <span className="text-stone-700 dark:text-stone-300 truncate max-w-45">{listing.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

          {/* ══ LEFT COLUMN ══════════════════════════════════════════════════ */}
          <div className="flex flex-col gap-5">

            {/* ── Image gallery ── */}
            <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] overflow-hidden shadow-sm">
              <div className="relative aspect-16/10 bg-stone-100 dark:bg-[#13151f] overflow-hidden group">
                <SafeImage
                  src={images[imgIdx] ?? listing.imageUrl}
                  type="cover"
                  alt={`Photo ${imgIdx + 1} of ${images.length}`}
                  fill
                />

                {/* Type badge */}
                <div className="absolute top-4 left-4">
                  <ListingTypeBadge
                    type={listing.type}
                    status={listing.status}
                    sellStatus={listing.sellStatus}
                    variant="solid"
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    soldClassName="text-xs font-bold px-3 py-1 rounded-full"
                  />
                </div>

                {/* Condition badge — sell listings only; rent/service have no condition */}
                {isSell && extra.condition && (
                  <div className="absolute top-4 right-4">
                    <ListingConditionBadge
                      condition={extra.condition}
                      className="text-xs font-semibold px-3 py-1"
                    />
                  </div>
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
                        "relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                        i === imgIdx ? "border-stone-800 dark:border-stone-300" : "border-transparent opacity-60 hover:opacity-100"
                      )}>
                      <SafeImage
                        src={img}
                        type="thumbnail"
                        alt={`Photo ${i + 1}`}
                        fill
                      />
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
                        <CheckCircle className="w-4 h-4 text-teal-500 shrink-0" />
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
                  value: isService ? extra.arrangement : extra.deliveryMethod,
                },
                {
                  icon:  <Eye className="w-4 h-4 text-stone-400" />,
                  label: "Transactions",
                  value: extra.transactionCount > 1 ? `${extra.transactionCount} Interactions` : `${extra.transactionCount} Interaction`,
                },
                {
                  icon:  <Star className="w-4 h-4 text-stone-400" />,
                  label: "Reviews",
                  value: extra.reviewCount > 1 ? `${extra.reviewCount} Reviews` : `${extra.reviewCount} Review`,
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="shrink-0">{row.icon}</div>
                  <span className="text-xs text-black dark:text-white w-36 shrink-0">{row.label}</span>
                  <span className="text-sm text-stone-700 dark:text-stone-200">{row.value}</span>
                </div>
              ))}
            </div>

            {/* ── Related listings ── */}
            {related.length > 0 && (
              <div>
                <h2 className="font-bold text-stone-900 dark:text-stone-50 text-base mb-3">You might also like</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {related.map((l) => <PostCard key={l.id} {...l} />)}
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
                  <span className="text-2xl font-extrabold text-amber-700 dark:text-amber-500">{formatPrice(listing.price)}</span>
                  {listing.priceUnit && <span className="text-black dark:text-white text-sm">{listing.priceUnit}</span>}
                </div>

                {/* Location + posted */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-black dark:text-white mb-4">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{listing.location}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Posted {formatTimeAgo(listing.postedAt)}</span>
                </div>

                {/* ── CTA buttons ── */}
                {isOwnListing ? (
                  <div className="flex flex-col gap-2">
                    {ownerUnavailableState ? (
                      <button
                        disabled
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-stone-400/80 text-white text-sm font-bold cursor-not-allowed opacity-95"
                      >
                        <AlertTriangle className="w-4 h-4" /> Unavailable
                      </button>
                    ) : isSold ? (
                      <button
                        disabled
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-emerald-600/90 text-white text-sm font-bold cursor-not-allowed opacity-95"
                      >
                        <CheckCircle className="w-4 h-4" /> Sold
                      </button>
                    ) : (
                      <>
                        <Link
                          href={`/listing/${id}/edit`}
                          className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-bold hover:opacity-90 transition-opacity">
                          Edit Listing
                        </Link>
                        <button
                          onClick={handleRemoveListing}
                          disabled={deleting}
                          className="flex items-center justify-center gap-2 w-full py-3 rounded-full border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {deleting ? "Removing..." : "Remove Listing"}
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {visitorUnavailableState ? (
                      <button
                        disabled
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-stone-400/80 text-white text-sm font-bold cursor-not-allowed opacity-95"
                      >
                        <AlertTriangle className="w-4 h-4" /> Unavailable
                      </button>
                    ) : isSold ? (
                      <button
                        disabled
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-emerald-600/90 text-white text-sm font-bold cursor-not-allowed opacity-95"
                      >
                        <CheckCircle className="w-4 h-4" /> Sold
                      </button>
                    ) : (
                      <>
                        {isSell && (
                          <button
                            onClick={handleBuy}
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-full border-2 border-stone-200 dark:border-[#2a2d3e] text-stone-700 dark:text-stone-200 bg-white dark:bg-transparent text-sm font-bold hover:border-stone-400 dark:hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-[#252837] transition-all active:scale-[0.98]">
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
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* ── Seller card ── */}
              <div className="flex flex-col gap-4 bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm p-5 mb-4">
                <div className="flex items-center gap-3">
                  <ImageLink
                    href={sellerProfileHref}
                    src={listing.seller.profileImageUrl}
                    type="profile"
                    label={listing.seller.name}
                    className="w-10 h-10"
                  >
                    {sellerOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1c1f2e]" />
                    )}
                  </ImageLink>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                    <p className="font-bold text-stone-900 dark:text-stone-50 text-sm">{listing.seller.name}</p>
                    <VerificationBadge verified={Boolean(listing.seller.isPro)} />
                    </div>
                      {hasSellerRating ? (
                        <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                          <Star className="w-3 h-3 fill-amber-400" /> {sellerRating.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400 dark:text-stone-500 font-medium">No ratings yet</span>
                      )}
                  </div>
                </div>

                {/* View Profile Button */}
                <Link
                  href={sellerProfileHref}
                  className="flex items-center justify-center w-full py-2.5 rounded-full border-2 border-stone-200 dark:border-[#2a2d3e] text-stone-700 dark:text-stone-200 bg-white dark:bg-transparent text-sm font-semibold hover:border-stone-400 dark:hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-[#252837] transition-all">
                  {isOwnListing ? "View My Profile" : "View Seller Profile"}
                </Link>

                {/* Contact Button */}
                <button
                  onClick={handleShowContactNumber}
                  disabled={isFetchingContact}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-full border-2 border-stone-200 dark:border-[#2a2d3e] text-stone-700 dark:text-stone-200 bg-white dark:bg-transparent text-sm font-bold hover:border-stone-400 dark:hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-[#252837] transition-all active:scale-[0.98]">
                  <Phone className="w-3.5 h-3.5" /> {shownContactNumber ?? (isFetchingContact ? "Loading Number..." : "Show Contact Number")}
                </button>
              </div>

              {/* ── Safety Tips ── */}
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

      <OfferModal
        open={offerOpen}
        title="Make an Offer"
        subtitle={listing.title}
        listedPrice={listing.price}
        offerAmount={offerAmount}
        onOfferAmountChange={setOfferAmt}
        note={offerMessage}
        onNoteChange={setOfferMessage}
        noteLabel="Add a message (optional)"
        notePlaceholder="e.g. Can we meet up in SM Calamba on Saturday?"
        submitLabel="Send Offer"
        submitting={submittingOffer}
        onSubmit={sendOffer}
        onClose={() => setOfferOpen(false)}
      />

      {/* ══ SCHEDULE REQUEST MODAL ══════════════════════════════════════════════ */}
      <ScheduleModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSubmit={sendSchedule}
        listingTitle={listing.title}
        listingPrice={listing.price}
        priceUnit={listing.priceUnit ?? ""}
        availableFrom={extra.available_from}
        daysOff={extra.daysOff ?? []}
        timeWindows={extra.timeWindows ?? []}
        submitLabel={isService ? "Request Service Schedule" : "Request Rent Schedule"}
      />

      {/* ══ REPORT MODAL ══════════════════════════════════════════════════════ */}
      {reportOpen && (
        <ReportModal
          open={reportOpen}
          title="Report Listing"
          subtitle="What&apos;s wrong with this listing?"
          submitting={submittingReport}
          onClose={handleCloseReportModal}
          onSubmit={handleSubmitReport}
        />
      )}

      {/* ── Mobile sticky bar ── */}
      {!isOwnListing && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#1c1f2e] border-t border-stone-200 dark:border-[#2a2d3e] px-4 py-3 flex gap-3 shadow-lg">
          {visitorUnavailableState ? (
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-stone-400/80 text-white text-sm font-bold cursor-not-allowed opacity-95"
            >
              <AlertTriangle className="w-4 h-4" /> Unavailable
            </button>
          ) : isSold ? (
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-emerald-600/90 text-white text-sm font-bold cursor-not-allowed opacity-95"
            >
              <CheckCircle className="w-4 h-4" /> Sold
            </button>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
