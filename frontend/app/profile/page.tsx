"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin, Mail, Phone, Calendar, Star, Eye, MessageCircle,
  Edit2, Plus, CheckCircle, Clock, ShieldCheck, Upload,
  ChevronRight, Package, Heart, BarChart2, X, Camera,
  TrendingUp, Trash2,
} from "lucide-react";
import { useUser } from "@/utils/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getProfileData, type ProfileListingItem } from "@/services/profileService";
import { type PostCardProps } from "@/components/post-card";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
type VerificationState = "unverified" | "pending" | "verified" | "rejected";
type VerifyStep = 1 | 2 | 3 | 4;
type ListingTab = "active" | "sold" | "drafts";
type ProfileTab = "listings" | "saved";
type DocType = "philsys" | "passport" | "drivers" | "sss" | "voters" | "other" | null;

interface ProfileForm {
  firstName: string;
  lastName: string;
  bio: string;
  location: string;
  phone: string;
  paymentMethods: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
// ─── Helpers ──────────────────────────────────────────────────────────────────
function resolveVerificationState(status: string): VerificationState {
  const normalized = status.toLowerCase();
  if (normalized === "verified") return "verified";
  if (normalized === "pending")  return "pending";
  if (normalized === "rejected") return "rejected";
  return "unverified";
}

function VerificationBadge({ state }: { state: VerificationState }) {
  if (state === "verified") return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
      <ShieldCheck className="w-3 h-3" /> Verified Seller
    </span>
  );
  if (state === "pending") return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
      <Clock className="w-3 h-3" /> Pending Verification
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
      {state === "rejected" ? "Verification Rejected" : "Unverified"}
    </span>
  );
}

// ─── Profile listing card ─────────────────────────────────────────────────────
function ProfileListingCard({ listing, showMeta = false, tab }: { listing: PostCardProps; showMeta?: boolean; tab?: ListingTab }) {
  const badgeClass = { sell: "bg-stone-800 text-stone-100", rent: "bg-teal-700 text-white", service: "bg-violet-700 text-white" }[listing.type];
  const badgeLabel = { sell: "For Sale", rent: "For Rent", service: "Service" }[listing.type];
  const statusColor: Record<ListingTab, string> = { active: "text-teal-600", sold: "text-red-500", drafts: "text-stone-400" };
  const statusLabel: Record<ListingTab, string> = { active: "Active", sold: "Sold", drafts: "Draft" };
  const fmt = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 });
  return (
    <Link href={`/listing/${listing.id}`} className="block group">
      <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl overflow-hidden border border-stone-200 dark:border-[#2a2d3e] hover:-translate-y-1 hover:shadow-md transition-all duration-200">
        <div className="relative aspect-4/3 bg-stone-100 dark:bg-[#13151f] overflow-hidden">
          <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <span className={cn("absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full", badgeClass)}>{badgeLabel}</span>
          {showMeta && tab && (
            <span className={cn("absolute top-2 right-2 text-[10px] font-semibold bg-white/90 dark:bg-black/70 px-2 py-0.5 rounded-full", statusColor[tab])}>
              ● {statusLabel[tab]}
            </span>
          )}
        </div>
        <div className="p-3">
          <p className="text-stone-800 dark:text-stone-100 font-semibold text-sm leading-tight truncate">{listing.title}</p>
          <div className="flex items-baseline gap-1 mt-0.5">
            <p className="text-stone-800 dark:text-stone-100 font-bold text-[15px]">{fmt.format(listing.price)}</p>
            {listing.priceUnit && <span className="text-xs text-stone-400 dark:text-stone-500">{listing.priceUnit}</span>}
          </div>
          {showMeta ? (
            <div className="flex items-center gap-3 mt-2 text-[11px] text-stone-400 dark:text-stone-500">
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> 142 views</span>
              <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> 3 inquiries</span>
            </div>
          ) : (
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-stone-400 dark:text-stone-500 truncate max-w-[65%]">{listing.location}</span>
              <span className="text-xs text-stone-400 dark:text-stone-500">{listing.postedAt}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Seller stats ─────────────────────────────────────────────────────────────
function SellerStats() {
  const stats = [
    { value: "12",   label: "Active Listings", icon: <Package className="w-4 h-4 text-stone-400 dark:text-stone-500" />,   delta: "+3 this month",    color: "text-teal-600 dark:text-teal-400"  },
    { value: "₱84k", label: "Total Sales",     icon: <BarChart2 className="w-4 h-4 text-stone-400 dark:text-stone-500" />, delta: "+₱12k this month", color: "text-teal-600 dark:text-teal-400"  },
    { value: "4.9",  label: "Avg. Rating",     icon: <Star className="w-4 h-4 text-stone-400 dark:text-stone-500" />,      delta: "42 reviews",       color: "text-amber-500 dark:text-amber-400"},
    { value: "98%",  label: "Response Rate",   icon: <TrendingUp className="w-4 h-4 text-stone-400 dark:text-stone-500" />,delta: "Avg. reply 2h",    color: "text-teal-600 dark:text-teal-400"  },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {stats.map((s) => (
        <div key={s.label} className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">{s.icon}</div>
          <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 leading-none">{s.value}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{s.label}</p>
          <p className={cn("text-[11px] font-medium mt-1.5", s.color)}>{s.delta}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Verify modal ─────────────────────────────────────────────────────────────
function VerifyModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: () => void }) {
  const [step, setStep] = useState<VerifyStep>(1);
  const [agreed, setAgreed] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocType>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const TOTAL = 4;

  function next() {
    if (step === 1 && !agreed) return;
    if (step < TOTAL) setStep((s) => (s + 1) as VerifyStep);
    else handleSubmit();
  }
  function prev() { if (step > 1) setStep((s) => (s - 1) as VerifyStep); }
  function handleSubmit() {
    setSubmitted(true);
    setTimeout(() => { onSubmit(); onClose(); setStep(1); setSubmitted(false); setAgreed(false); setSelectedDoc(null); setShowOtp(false); }, 2800);
  }

  const docOptions = [
    { key: "philsys" as DocType,  icon: "🆔", label: "PhilSys"         },
    { key: "passport" as DocType, icon: "📒", label: "Passport"         },
    { key: "drivers" as DocType,  icon: "🚗", label: "Driver's License" },
    { key: "sss" as DocType,      icon: "🪙", label: "SSS / GSIS"       },
    { key: "voters" as DocType,   icon: "🗳️", label: "Voter's ID"       },
    { key: "other" as DocType,    icon: "📄", label: "Other Gov't ID"   },
  ];

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-[#1e2433] rounded-t-2xl px-7 py-5 relative">
          <button onClick={onClose} className="absolute top-4 right-5 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-white font-bold text-xl">Become a Seller</h2>
          <p className="text-slate-400 text-sm mt-1">Complete 3 quick steps to get verified</p>
          <div className="flex gap-1.5 mt-4">
            {[1,2,3,4].map((i) => (
              <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors duration-300",
                submitted ? "bg-teal-400" : i < step ? "bg-teal-400" : i === step ? "bg-amber-400" : "bg-white/20")} />
            ))}
          </div>
        </div>

        <div className="p-7">
          {submitted ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">Application Submitted!</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed max-w-xs mx-auto">Your seller application is under review. We'll send an email within 1–2 business days.</p>
              <div className="mt-5 p-4 bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl text-sm text-stone-600 dark:text-stone-300 text-left leading-relaxed">
                📬 <strong className="text-stone-800 dark:text-stone-200">What happens next?</strong><br />Our team reviews your documents → You receive a ✅ Verified Seller badge → Start listing and earning!
              </div>
            </div>
          ) : step === 1 ? (
            <>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base mb-1">What you'll need 📋</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-5 leading-relaxed">To become a verified seller, we'll need a few things to confirm your identity.</p>
              <div className="flex flex-col gap-3 mb-5">
                {[
                  { icon: "🪪", title: "Government-Issued ID",  desc: "PhilSys, Passport, Driver's License, SSS, GSIS, or Voter's ID" },
                  { icon: "🤳", title: "Selfie with your ID",    desc: "A clear photo of you holding your ID for liveness verification" },
                  { icon: "📞", title: "Verified Phone Number",  desc: "A valid PH mobile number for OTP verification and buyer contact" },
                ].map((r) => (
                  <div key={r.title} className="flex items-start gap-3 p-4 border border-stone-200 dark:border-[#2a2d3e] rounded-xl bg-stone-50 dark:bg-[#13151f]">
                    <span className="text-xl shrink-0">{r.icon}</span>
                    <div>
                      <p className="font-semibold text-sm text-stone-800 dark:text-stone-200">{r.title}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">{r.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-teal-600" />
                <span className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  I agree to the <a href="#" className="text-stone-700 dark:text-stone-300 underline">Seller Terms of Service</a> and confirm I am at least 18 years old and a resident of the Philippines.
                </span>
              </label>
            </>
          ) : step === 2 ? (
            <>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base mb-1">Upload your ID 🪪</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-4 leading-relaxed">Select an ID type and upload a clear, well-lit photo.</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {docOptions.map((d) => (
                  <button key={d.key} onClick={() => setSelectedDoc(d.key)}
                    className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all",
                      selectedDoc === d.key
                        ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-stone-800 dark:text-stone-200"
                        : "border-stone-200 dark:border-[#2a2d3e] text-stone-500 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600")}>
                    <span className="text-lg">{d.icon}</span>{d.label}
                  </button>
                ))}
              </div>
              <div className="border-2 border-dashed border-stone-200 dark:border-[#2a2d3e] rounded-xl p-8 text-center hover:border-stone-300 dark:hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-[#13151f] transition-all cursor-pointer">
                <Upload className="w-7 h-7 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-stone-600 dark:text-stone-300">Click to upload front of ID</p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">JPG, PNG or PDF · Max 5MB</p>
              </div>
            </>
          ) : step === 3 ? (
            <>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base mb-1">Selfie with your ID 🤳</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-4 leading-relaxed">Hold your ID clearly next to your face.</p>
              <div className="border-2 border-dashed border-stone-200 dark:border-[#2a2d3e] rounded-xl p-8 text-center hover:border-stone-300 dark:hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-[#13151f] transition-all cursor-pointer mb-3">
                <Camera className="w-7 h-7 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-stone-600 dark:text-stone-300">Use camera or upload a photo</p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Face must match ID · No filters</p>
              </div>
              <div className="bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl p-3 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                <strong className="text-stone-800 dark:text-stone-200">Tips:</strong> Good lighting · Both face & ID fully visible · No sunglasses · Taken today
              </div>
            </>
          ) : (
            !showOtp ? (
              <>
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base mb-1">Verify your phone 📞</h3>
                <p className="text-sm text-stone-500 dark:text-stone-400 mb-5 leading-relaxed">Enter your Philippine mobile number.</p>
                <div className="mb-4">
                  <label className="text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5 block">Mobile Number</label>
                  <div className="flex gap-2">
                    <div className="flex items-center justify-center bg-stone-100 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-lg px-3 text-sm text-stone-500 dark:text-stone-400 font-medium w-16 shrink-0">+63</div>
                    <Input type="tel" placeholder="9XX XXX XXXX" className="flex-1" />
                  </div>
                </div>
                <Button className="w-full bg-stone-900 hover:bg-stone-800 text-white" onClick={() => setShowOtp(true)}>Send OTP Code</Button>
              </>
            ) : (
              <>
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base mb-1">Enter OTP 🔢</h3>
                <p className="text-sm text-stone-500 dark:text-stone-400 mb-5">We sent a 6-digit code to your number.</p>
                <div className="flex justify-center gap-2 mb-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <input key={i} maxLength={1}
                      className="w-10 h-11 rounded-lg border border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f] text-center text-lg font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-400 dark:focus:border-stone-500"
                      onInput={(e) => { const nxt = e.currentTarget.nextSibling as HTMLInputElement; if ((e.target as HTMLInputElement).value && nxt) nxt.focus(); }} />
                  ))}
                </div>
                <p className="text-center text-xs text-stone-400 dark:text-stone-500">
                  Didn't receive a code? <button className="text-stone-600 dark:text-stone-300 underline">Resend in 0:45</button>
                </p>
              </>
            )
          )}

          {!submitted && (
            <div className="flex items-center justify-between mt-6 pt-5 border-t border-stone-200 dark:border-[#2a2d3e]">
              <span className="text-xs text-stone-400 dark:text-stone-500">Step {step} of {TOTAL}</span>
              <div className="flex gap-2">
                {step > 1 && <Button variant="outline" onClick={prev} className="text-sm dark:border-[#2a2d3e] dark:text-stone-300 dark:hover:bg-[#252837]">← Back</Button>}
                <Button className="bg-stone-900 hover:bg-stone-800 text-white text-sm" onClick={next} disabled={step === 1 && !agreed}>
                  {step === TOTAL ? "Submit Application" : "Continue →"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Image upload hook with remove support ────────────────────────────────────
function useImageUpload(storageKey: string, initialSrc?: string | null) {
  const [src, setSrc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setSrc(saved);
      return;
    }
    if (initialSrc) setSrc(initialSrc);
  }, [storageKey, initialSrc]);

  function trigger() { inputRef.current?.click(); }

  function remove() {
    setSrc(null);
    localStorage.removeItem(storageKey);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSrc(result);
      localStorage.setItem(storageKey, result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return { src, trigger, remove, inputRef, onFileChange };
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, saveUserData } = useUser();
  const verificationState: VerificationState = resolveVerificationState(user?.status ?? "");

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    bio: "", location: "", phone: "",
    paymentMethods: "GCash, Cash on Delivery",
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [userListings, setUserListings] = useState<ProfileListingItem[]>([]);
  const [bookmarkListings, setBookmarkListings] = useState<ProfileListingItem[]>([]);
  const [listingTab, setListingTab] = useState<ListingTab>("active");
  const [profileTab, setProfileTab] = useState<ProfileTab>("listings");
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const avatar = useImageUpload("profile_avatar", user?.profileImageUrl ?? null);
  const cover  = useImageUpload("profile_cover", user?.coverImageUrl ?? null);

  useEffect(() => { if (user) setForm((f) => ({ ...f, firstName: user.firstName, lastName: user.lastName })); }, [user]);
  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);
      try {
        const payload = await getProfileData();
        setUserListings(payload.listings);
        setBookmarkListings(payload.bookmarks);
        saveUserData(payload.user);
        setForm((f) => ({
          ...f,
          firstName: payload.user.firstName,
          lastName: payload.user.lastName,
          bio: payload.user.bio ?? "",
          location: [payload.user.locationCity, payload.user.locationProv].filter(Boolean).join(", "),
          phone: payload.user.phoneNumber ?? "",
        }));
      } catch {
        showToast("Failed to load profile data");
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, []);

  const soldStatus = new Set(["sold", "rented", "completed"]);
  const draftStatus = new Set(["hidden"]);

  const activeListings = userListings.filter((l) => {
    const status = (l.status ?? "").toLowerCase();
    return status === "" || status === "active" || status === "available" || (!soldStatus.has(status) && !draftStatus.has(status));
  });

  const soldListings = userListings.filter((l) => soldStatus.has((l.status ?? "").toLowerCase()));
  const draftListings = userListings.filter((l) => draftStatus.has((l.status ?? "").toLowerCase()));
  const allListings: PostCardProps[] = listingTab === "active"
    ? activeListings
    : listingTab === "sold"
      ? soldListings
      : draftListings;

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2800); }

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      if (user) saveUserData({ ...user, firstName: form.firstName, lastName: form.lastName });
      setSaving(false); setEditOpen(false);
      showToast("✅ Profile updated successfully");
    }, 700);
  }

  function handleVerifySubmit() {
    if (user) saveUserData({ ...user, status: "PENDING" });
    showToast("🎉 Application submitted! Under review.");
  }

  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() || "?";
  const fullName = user ? `${user.firstName} ${user.lastName}` : "—";
  const locationText = [user?.locationCity, user?.locationProv].filter(Boolean).join(", ") || "Location not set";

  // Shared label style
  const lbl = "text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5 block";

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-[#0f1117]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-20">

        {/* ── Profile header card ── */}
        <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm overflow-hidden mb-5">

          {/* Cover photo */}
          <div className="relative h-32 bg-linear-to-r from-[#1e2433] via-[#2a3650] to-[#1a2a3a] overflow-hidden group cursor-pointer" onClick={cover.trigger}>
            {cover.src
              ? <Image src={cover.src} alt="Cover" fill className="object-cover" />
              : <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-white text-sm font-medium bg-black/40 px-4 py-2 rounded-full">
                <Camera className="w-4 h-4" /> {cover.src ? "Change Cover" : "Upload Cover Photo"}
              </div>
            </div>
            {/* Remove cover button */}
            {cover.src && (
              <button
                onClick={(e) => { e.stopPropagation(); cover.remove(); showToast("Cover photo removed"); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors opacity-0 group-hover:opacity-100"
                title="Remove cover photo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <input ref={cover.inputRef} type="file" accept="image/*" className="hidden" onChange={cover.onFileChange} />
          </div>

          <div className="px-6 pb-5">
            <div className="flex items-end justify-between -mt-10 mb-3">

              {/* Avatar with change/remove menu */}
              <div className="relative">
                <div
                  className="relative group cursor-pointer w-20 h-20"
                  onClick={() => setShowAvatarMenu((v) => !v)}
                >
                  <div className="w-20 h-20 rounded-full border-4 border-white dark:border-[#1c1f2e] overflow-hidden shadow-md bg-linear-to-br from-[#3a4a6a] to-[#1e2a40] flex items-center justify-center">
                    {avatar.src
                      ? <Image src={avatar.src} alt="Avatar" width={80} height={80} className="object-cover w-full h-full" />
                      : <span className="text-2xl font-bold text-slate-200">{initials}</span>}
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="absolute bottom-1 right-0 w-6 h-6 bg-stone-800 border-2 border-white dark:border-[#1c1f2e] rounded-full flex items-center justify-center pointer-events-none">
                    <Edit2 className="w-2.5 h-2.5 text-stone-300" />
                  </div>
                </div>

                {/* Avatar dropdown menu */}
                {showAvatarMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowAvatarMenu(false)} />
                    <div className="absolute top-full left-0 mt-2 z-20 bg-white dark:bg-[#1c1f2e] border border-stone-200 dark:border-[#2a2d3e] rounded-xl shadow-lg overflow-hidden w-44">
                      <button
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors"
                        onClick={() => { avatar.trigger(); setShowAvatarMenu(false); }}
                      >
                        <Camera className="w-4 h-4 text-stone-400" />
                        {avatar.src ? "Change Photo" : "Upload Photo"}
                      </button>
                      {avatar.src && (
                        <button
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-stone-100 dark:border-[#2a2d3e]"
                          onClick={() => { avatar.remove(); setShowAvatarMenu(false); showToast("Profile photo removed"); }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove Photo
                        </button>
                      )}
                    </div>
                  </>
                )}
                <input ref={avatar.inputRef} type="file" accept="image/*" className="hidden" onChange={avatar.onFileChange} />
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pb-1">
                <Button variant="outline" size="sm"
                  className="text-xs rounded-full border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300 hover:border-stone-400 dark:hover:border-stone-500 dark:bg-transparent dark:hover:bg-[#252837]"
                  onClick={() => setEditOpen((v) => !v)}>
                  <Edit2 className="w-3 h-3" />
                  {editOpen ? "Cancel" : "Edit Profile"}
                </Button>
                {verificationState === "verified" && (
                  <Button size="sm" className="text-xs rounded-full bg-stone-900 hover:bg-stone-800 text-white" onClick={() => showToast("Opening new listing form…")}>
                    <Plus className="w-3 h-3" /> New Listing
                  </Button>
                )}
              </div>
            </div>

            {/* Name + badge */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">{fullName}</h1>
              <VerificationBadge state={verificationState} />
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mb-3">Member since Jan 2024</p>

            {/* Meta row */}
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              <span className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400"><MapPin className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" /> {locationText}</span>
              <span className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400"><Mail className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" /> {user?.email}</span>
              <span className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400"><Calendar className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" /> Last active today</span>
              {verificationState === "verified" && (<>
                <span className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400"><Star className="w-3.5 h-3.5 text-amber-400" /> 4.9 · 42 reviews</span>
                <span className="flex items-center gap-1.5 text-xs text-teal-600 dark:text-teal-400 font-medium"><CheckCircle className="w-3.5 h-3.5" /> Identity Verified</span>
              </>)}
            </div>
          </div>
        </div>

        {/* ── Edit profile form ── */}
        {editOpen && (
          <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm mb-5">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-[#2a2d3e]">
              <h2 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Edit Profile</h2>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>First Name</label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
                <div><label className={lbl}>Last Name</label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
                <div className="col-span-2">
                  <label className={lbl}>Bio</label>
                  <textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="Tell buyers and sellers a bit about yourself…"
                    className="w-full bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-stone-800 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 outline-none focus:border-stone-400 dark:focus:border-stone-500 resize-none" />
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">{form.bio.length} / 200</p>
                </div>
                <div><label className={lbl}>Location</label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City, Province or Barangay" /></div>
                <div><label className={lbl}>Phone (private)</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+63 9XX XXX XXXX" type="tel" /></div>
                <div className="col-span-2"><label className={lbl}>Preferred Payment Methods</label><Input value={form.paymentMethods} onChange={(e) => setForm({ ...form, paymentMethods: e.target.value })} placeholder="e.g. GCash, BDO, Cash on Delivery" /></div>
              </div>
              <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-stone-200 dark:border-[#2a2d3e]">
                <Button variant="outline" size="sm" className="rounded-full dark:border-[#2a2d3e] dark:text-stone-300 dark:hover:bg-[#252837]" onClick={() => setEditOpen(false)}>Discard</Button>
                <Button size="sm" className="rounded-full bg-stone-900 hover:bg-stone-800 text-white" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Seller stats ── */}
        {verificationState === "verified" && <SellerStats />}

        {/* ── Two-col layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_288px] gap-5 items-start">

          {/* Left */}
          <div>
            <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-stone-200 dark:border-[#2a2d3e]">
                {(["listings", "saved"] as const).map((t) => (
                  <button key={t} onClick={() => setProfileTab(t)}
                    className={cn("flex-1 py-3.5 text-sm font-medium transition-colors",
                      profileTab === t
                        ? "text-stone-900 dark:text-stone-100 border-b-2 border-stone-900 dark:border-stone-300"
                        : "text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300")}>
                    {t === "listings" ? "📦 My Listings" : "❤️ Saved Items"}
                  </button>
                ))}
              </div>

              {/* My Listings */}
              {profileTab === "listings" && (<>
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                  <div className="flex gap-1">
                    {(["active", "sold", "drafts"] as const).map((t) => (
                      <button key={t} onClick={() => setListingTab(t)}
                        className={cn("text-xs font-medium px-3 py-1.5 rounded-full transition-colors capitalize",
                          listingTab === t
                            ? "bg-stone-900 dark:bg-stone-200 text-white dark:text-stone-900"
                            : "text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#252837]")}>
                        {t === "active"
                          ? `🟢 Active (${activeListings.length})`
                          : t === "sold"
                            ? `✅ Sold (${soldListings.length})`
                            : `📝 Drafts (${draftListings.length})`}
                      </button>
                    ))}
                  </div>
                  <Link href="/create">
                    <Button size="sm" className="text-xs rounded-full bg-stone-900 hover:bg-stone-800 text-white h-7 px-3">
                      <Plus className="w-3 h-3" /> Add
                    </Button>
                  </Link>
                </div>
                {loadingProfile ? (
                  <div className="text-center py-14 px-6">
                    <p className="font-semibold text-stone-400 text-sm">Loading listings...</p>
                  </div>
                ) : allListings.length > 0
                  ? <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">{allListings.map((l) => <ProfileListingCard key={l.id} listing={l} showMeta tab={listingTab} />)}</div>
                  : <div className="text-center py-14 px-6"><Package className="w-10 h-10 text-stone-200 dark:text-stone-700 mx-auto mb-3" /><p className="font-semibold text-stone-400 text-sm">No listings yet</p><Link href="/create"><Button size="sm" className="mt-4 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs"><Plus className="w-3 h-3" /> Add Listing</Button></Link></div>}
              </>)}

              {/* Saved Items */}
              {profileTab === "saved" && (
                loadingProfile
                  ? <div className="text-center py-14"><p className="font-semibold text-stone-400 text-sm">Loading saved items...</p></div>
                  : bookmarkListings.length > 0
                  ? <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">{bookmarkListings.map((l) => <ProfileListingCard key={l.id} listing={l} />)}</div>
                  : <div className="text-center py-14"><Heart className="w-10 h-10 text-stone-200 dark:text-stone-700 mx-auto mb-3" /><p className="font-semibold text-stone-400 text-sm">No saved items yet</p></div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-4">

            {/* Buyer CTA */}
            {(verificationState === "unverified" || verificationState === "rejected") && (
              <div className="relative rounded-2xl overflow-hidden bg-[#1e2433] border border-[#2e3a50] p-5">
                <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ background: "radial-gradient(circle at 80% 20%, #ffd700, transparent 50%), radial-gradient(circle at 20% 80%, #60a5fa, transparent 40%)" }} />
                <div className="relative">
                  <div className="text-3xl mb-3">🏪</div>
                  <h3 className="text-white font-bold text-base mb-1">Start Selling on P2P</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-4">Reach thousands of local buyers. List items for free and grow your income.</p>
                  <ul className="flex flex-col gap-2 mb-5">
                    {["Free to list, no monthly fees","Verified seller badge builds trust","Reach buyers across Luzon","Seller analytics & insights"].map((p) => (
                      <li key={p} className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-teal-400 shrink-0 text-[10px]">✓</span>{p}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => setVerifyOpen(true)} className="w-full py-2.5 rounded-full text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95" style={{ background: "linear-gradient(135deg, #b8860b, #c9a84c)" }}>
                    ⚡ Become a Seller
                  </button>
                </div>
              </div>
            )}

            {/* Pending */}
            {verificationState === "pending" && (
              <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-5">
                <h3 className="font-bold text-amber-800 dark:text-amber-400 text-sm mb-1">⏳ Verification In Progress</h3>
                <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed mb-4">Your seller application is being reviewed. We'll notify you within 1–2 business days.</p>
                <div className="flex flex-col gap-2.5 mb-4">
                  {[
                    { label: "Profile completed", done: true },
                    { label: "ID submitted",       done: true },
                    { label: "Under review",       done: false, active: true },
                    { label: "Approval",           done: false },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                        s.done ? "bg-teal-500 text-white" : (s as any).active ? "bg-amber-400 text-white" : "bg-stone-200 dark:bg-stone-700 text-stone-400 dark:text-stone-500")}>
                        {s.done ? "✓" : (s as any).active ? "…" : i + 1}
                      </div>
                      <span className={cn("text-xs", s.done ? "line-through text-stone-400 dark:text-stone-600" : (s as any).active ? "text-amber-800 dark:text-amber-400 font-medium" : "text-stone-400 dark:text-stone-500")}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/20"
                  onClick={() => showToast("Application status page coming soon")}>
                  View Application Status
                </Button>
              </div>
            )}

            {/* Verified seller badge */}
            {verificationState === "verified" && (
              <div className="rounded-2xl border border-amber-300 dark:border-amber-700 bg-linear-to-b from-amber-50 to-white dark:from-amber-950/20 dark:to-[#1c1f2e] p-5 text-center">
                <div className="text-3xl mb-2">👑</div>
                <h3 className="font-bold text-amber-800 dark:text-amber-400 text-sm">Verified Seller</h3>
                <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">Identity verified · Trusted by P2P</p>
                <div className="text-amber-400 text-sm tracking-widest mt-2">★★★★★</div>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">Seller since March 2024 · 42 sales</p>
              </div>
            )}

            {/* Account info */}
            <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-stone-200 dark:border-[#2a2d3e]">
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Account</h3>
              </div>
              <div className="divide-y divide-stone-100 dark:divide-[#252837]">
                {[
                  { icon: <Mail className="w-3.5 h-3.5" />,        label: "Email",    value: user?.email ?? "—", ok: true },
                  { icon: <Phone className="w-3.5 h-3.5" />,       label: "Phone",    value: user?.phoneNumber || "Not added", ok: Boolean(user?.phoneNumber) },
                  { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: "Identity", value: verificationState === "verified" ? "Verified ✓" : verificationState === "pending" ? "Under review…" : verificationState === "rejected" ? "Rejected" : "Not verified", ok: verificationState === "verified" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between px-5 py-3">
                    <span className="flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500">{item.icon}{item.label}</span>
                    <span className={cn("text-xs font-medium", item.ok ? "text-teal-600 dark:text-teal-400" : "text-amber-600 dark:text-amber-500")}>{item.value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-xs text-stone-400 dark:text-stone-500">Role</span>
                  <span className="text-xs font-medium text-stone-600 dark:text-stone-300">{user?.role ?? "USER"}</span>
                </div>
                <div className="px-5 py-3">
                  <a href="#" className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 flex items-center gap-1">
                    Change password <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Danger zone */}
            <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm p-4 flex flex-col gap-2">
              <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 tracking-widest mb-1">ACCOUNT ACTIONS</p>
              <Button variant="outline" size="sm" className="text-xs w-full border-stone-200 dark:border-[#2a2d3e] text-stone-500 dark:text-stone-400 dark:hover:bg-[#252837]" onClick={() => showToast("Downloading your data…")}>
                📥 Download My Data
              </Button>
              <Button variant="outline" size="sm" className="text-xs w-full border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300" onClick={() => showToast("Account deletion — contact support")}>
                🗑 Delete Account
              </Button>
            </div>

          </div>
        </div>
      </div>

      <VerifyModal open={verifyOpen} onClose={() => setVerifyOpen(false)} onSubmit={handleVerifySubmit} />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          {toast}
        </div>
      )}
    </div>
  );
}
