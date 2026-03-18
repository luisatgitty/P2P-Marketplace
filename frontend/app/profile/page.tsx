"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  MapPin, Mail, Calendar, Eye, EyeOff, MessageCircle,
  Edit2, Plus, ShieldCheck, Package, Bookmark,
  Camera, Trash2, AlertTriangle,
} from "lucide-react";
import { useUser } from "@/utils/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  deactivateProfile,
  getProfileData,
  getUserProfileData,
  type ProfilePayload,
  updateProfileImages,
  updateProfileData,
  type ProfileListingItem,
} from "@/services/profileService";
import {
  getBarangaysByCity,
  getCitiesByProvince,
  getProvinces,
  type LocationOption,
} from "@/services/locationService";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
type VerificationState = "unverified" | "pending" | "verified" | "rejected";
type ListingTab = "all" | "active" | "sold" | "booked";
type ProfileTab = "listings" | "bookmarks";

const SOLD_STATUSES = new Set(["sold", "rented", "completed"]);
const BOOKED_STATUSES = new Set(["hidden"]);

interface ProfileForm {
  firstName: string;
  lastName: string;
  bio: string;
  phone: string;
  locationProv: string;
  locationCity: string;
  locationBrgy: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

type EditableProfileSnapshot = Pick<
  ProfileForm,
  "firstName" | "lastName" | "bio" | "phone" | "locationProv" | "locationCity" | "locationBrgy"
>;

function normalizeEditableProfile(form: EditableProfileSnapshot): EditableProfileSnapshot {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    bio: form.bio.trim(),
    phone: form.phone.trim(),
    locationProv: form.locationProv.trim(),
    locationCity: form.locationCity.trim(),
    locationBrgy: form.locationBrgy.trim(),
  };
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
      <ShieldCheck className="w-3 h-3" /> Verified
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
      <ShieldCheck className="w-3 h-3" /> Unverified
    </span>
  );
}

// ─── Profile listing card ─────────────────────────────────────────────────────
function ProfileListingCard({ listing, showMeta = false, tab }: { listing: ProfileListingItem; showMeta?: boolean; tab?: ListingTab }) {
  const badgeClass = { sell: "bg-stone-800 text-stone-100", rent: "bg-teal-700 text-white", service: "bg-violet-700 text-white" }[listing.type];
  const badgeLabel = { sell: "For Sale", rent: "For Rent", service: "Service" }[listing.type];
  const statusColor: Record<ListingTab, string> = { all: "text-stone-500", active: "text-teal-600", sold: "text-red-500", booked: "text-stone-400" };
  const statusLabel: Record<ListingTab, string> = { all: "All", active: "Active", sold: "Sold", booked: "Booked" };
  const normalizedStatus = (listing.status ?? "").toLowerCase();
  const statusByListing = SOLD_STATUSES.has(normalizedStatus)
    ? { label: "Sold", color: statusColor.sold }
    : BOOKED_STATUSES.has(normalizedStatus)
      ? { label: "Booked", color: statusColor.booked }
      : { label: "Active", color: statusColor.active };
  const statusMeta = tab === "all"
    ? statusByListing
    : tab
      ? { label: statusLabel[tab], color: statusColor[tab] }
      : null;
  const fmt = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 });
  return (
    <Link href={`/listing/${listing.id}`} className="block group">
      <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl overflow-hidden border border-stone-200 dark:border-[#2a2d3e] hover:-translate-y-1 hover:shadow-md transition-all duration-200">
        <div className="relative aspect-4/3 bg-stone-100 dark:bg-[#13151f] overflow-hidden">
          <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <span className={cn("absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full", badgeClass)}>{badgeLabel}</span>
          {showMeta && statusMeta && (
            <span className={cn("absolute top-2 right-2 text-[10px] font-semibold bg-white/90 dark:bg-black/70 px-2 py-0.5 rounded-full", statusMeta.color)}>
              ● {statusMeta.label}
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

function AddListingCard() {
  return (
    <Link href="/create" className="block group">
      <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl overflow-hidden border border-dashed border-stone-300 dark:border-[#3a3e52] hover:-translate-y-1 hover:shadow-md transition-all duration-200 h-full">
        <div className="relative aspect-4/3 bg-stone-50 dark:bg-[#13151f] flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-stone-900 dark:bg-stone-200 text-white dark:text-stone-900 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
            <Plus className="w-5 h-5" />
          </div>
        </div>
        <div className="p-3">
          <p className="text-stone-800 dark:text-stone-100 font-semibold text-sm leading-tight">Add Listing</p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Post a new item or service</p>
        </div>
      </div>
    </Link>
  );
}

// ─── Image upload hook with remove support ────────────────────────────────────
function useImageUpload(initialSrc?: string | null, onUploaded?: (file: File) => Promise<void>) {
  const [src, setSrc] = useState<string | null>(initialSrc ?? null);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSrc(initialSrc ?? null);
    setFile(null);
  }, [initialSrc]);

  function trigger() { inputRef.current?.click(); }

  function remove() {
    setSrc(null);
    setFile(null);
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const previous = src;
    setFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSrc(result);
    };
    reader.readAsDataURL(file);

    if (onUploaded) {
      try {
        await onUploaded(file);
      } catch {
        setSrc(previous ?? null);
      }
    }

    e.target.value = "";
  }

  return { src, file, trigger, remove, inputRef, onFileChange };
}

type EncodedImagePayload = {
  name: string;
  mimeType: string;
  data: string;
};

async function compressImageForProfile(file: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Invalid image file."));
      img.src = objectUrl;
    });

    const maxDimension = 1200;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((output) => resolve(output), "image/webp", 0.8);
    });

    return blob ?? file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function encodeFileToPayload(file: File): Promise<EncodedImagePayload> {
  const compressed = await compressImageForProfile(file);

  const data = await new Promise<string>((resolve, reject) => {
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
    reader.readAsDataURL(compressed);
  });

  const baseName = file.name.replace(/\.[^/.]+$/, "");

  return {
    name: `${baseName}.webp`,
    mimeType: "image/webp",
    data,
  };
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const searchParams = useSearchParams();
  const { user, saveUserData, clearUserData } = useUser();
  const externalUserId = (searchParams.get("userId") ?? "").trim();
  const isViewingExternalProfile = externalUserId !== "";
  const [profileUser, setProfileUser] = useState<ProfilePayload["user"] | null>(null);
  const verificationState: VerificationState = resolveVerificationState(profileUser?.status ?? user?.status ?? "");

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    bio: "",
    phone: "",
    locationProv: "",
    locationCity: "",
    locationBrgy: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [loadingEditProfile, setLoadingEditProfile] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userListings, setUserListings] = useState<ProfileListingItem[]>([]);
  const [bookmarkListings, setBookmarkListings] = useState<ProfileListingItem[]>([]);
  const [listingTab, setListingTab] = useState<ListingTab>("active");
  const [profileTab, setProfileTab] = useState<ProfileTab>("listings");
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [barangays, setBarangays] = useState<LocationOption[]>([]);
  const [selectedProvCode, setSelectedProvCode] = useState("");
  const [selectedCityCode, setSelectedCityCode] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [editSnapshot, setEditSnapshot] = useState<EditableProfileSnapshot | null>(null);

  function showErrorToast(msg: string) {
    toast.error(msg, { position: "top-center" });
  }

  function showSuccessToast(msg: string) {
    toast.success(msg, { position: "top-center" });
  }

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const profileImage = await encodeFileToPayload(file);
      const updatedUser = await updateProfileImages({ profileImage });
      if (user) saveUserData({ ...user, ...updatedUser });
      showSuccessToast("Profile photo updated");
    } catch (err) {
      const message = typeof err === "string" ? err : (err instanceof Error ? err.message : "Failed to update profile photo");
      showErrorToast(message);
      throw err;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true);
    try {
      const coverImage = await encodeFileToPayload(file);
      const updatedUser = await updateProfileImages({ coverImage });
      if (user) saveUserData({ ...user, ...updatedUser });
      showSuccessToast("Cover photo updated");
    } catch (err) {
      const message = typeof err === "string" ? err : (err instanceof Error ? err.message : "Failed to update cover photo");
      showErrorToast(message);
      throw err;
    } finally {
      setUploadingCover(false);
    }
  };

  const avatar = useImageUpload(profileUser?.profileImageUrl ?? null, handleAvatarUpload);
  const cover  = useImageUpload(profileUser?.coverImageUrl ?? null, handleCoverUpload);

  useEffect(() => {
    if (!isViewingExternalProfile && user) {
      setForm((f) => ({ ...f, firstName: user.firstName, lastName: user.lastName }));
    }
  }, [user, isViewingExternalProfile]);

  useEffect(() => {
    if (isViewingExternalProfile) {
      setProfileTab("listings");
    }
  }, [isViewingExternalProfile]);

  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const data = await getProvinces();
        setProvinces(data);
      } catch {
        showErrorToast("Failed to load provinces");
      }
    };

    loadProvinces();
  }, []);

  useEffect(() => {
    if (!selectedProvCode) {
      setCities([]);
      setSelectedCityCode("");
      return;
    }

    const loadCities = async () => {
      try {
        const data = await getCitiesByProvince(selectedProvCode);
        setCities(data);

        const matched = data.find((x) => x.name === form.locationCity);
        setSelectedCityCode(matched?.code ?? "");
      } catch {
        showErrorToast("Failed to load cities/municipalities");
      }
    };

    loadCities();
  }, [selectedProvCode]);

  useEffect(() => {
    if (!selectedCityCode) {
      setBarangays([]);
      return;
    }

    const loadBarangays = async () => {
      try {
        const data = await getBarangaysByCity(selectedCityCode);
        setBarangays(data);
      } catch {
        showErrorToast("Failed to load barangays");
      }
    };

    loadBarangays();
  }, [selectedCityCode]);

  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);
      try {
        const payload = isViewingExternalProfile
          ? await getUserProfileData(externalUserId)
          : await getProfileData();

        setProfileUser(payload.user);
        setUserListings(payload.listings);
        setBookmarkListings(isViewingExternalProfile ? [] : payload.bookmarks);
        if (!isViewingExternalProfile) {
          saveUserData(payload.user);
        }
        setForm((f) => ({
          ...f,
          firstName: payload.user.firstName,
          lastName: payload.user.lastName,
          bio: payload.user.bio ?? "",
          phone: payload.user.phoneNumber ?? "",
          locationProv: payload.user.locationProv ?? "",
          locationCity: payload.user.locationCity ?? "",
          locationBrgy: payload.user.locationBrgy ?? "",
        }));
      } catch {
        showErrorToast("Failed to load profile data");
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [isViewingExternalProfile, externalUserId]);

  useEffect(() => {
    if (!form.locationProv || provinces.length === 0) return;
    const matched = provinces.find((p) => p.name === form.locationProv);
    if (matched && matched.code !== selectedProvCode) {
      setSelectedProvCode(matched.code);
    }
  }, [form.locationProv, provinces]);

  const activeListings = userListings.filter((l) => {
    const status = (l.status ?? "").toLowerCase();
    return status === "" || status === "active" || status === "available" || (!SOLD_STATUSES.has(status) && !BOOKED_STATUSES.has(status));
  });

  const soldListings = userListings.filter((l) => SOLD_STATUSES.has((l.status ?? "").toLowerCase()));
  const bookedListings = userListings.filter((l) => BOOKED_STATUSES.has((l.status ?? "").toLowerCase()));
  const allListings: ProfileListingItem[] = listingTab === "all"
    ? userListings
    : listingTab === "active"
      ? activeListings
      : listingTab === "sold"
        ? soldListings
        : bookedListings;

  async function handleSave() {
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      showErrorToast("New password and confirm password do not match");
      return;
    }

    const currentComparable = normalizeEditableProfile({
      firstName: form.firstName,
      lastName: form.lastName,
      bio: form.bio,
      phone: form.phone,
      locationProv: form.locationProv,
      locationCity: form.locationCity,
      locationBrgy: form.locationBrgy,
    });

    const baselineComparable = normalizeEditableProfile(
      editSnapshot ?? {
        firstName: user?.firstName ?? "",
        lastName: user?.lastName ?? "",
        bio: user?.bio ?? "",
        phone: user?.phoneNumber ?? "",
        locationProv: user?.locationProv ?? "",
        locationCity: user?.locationCity ?? "",
        locationBrgy: user?.locationBrgy ?? "",
      }
    );

    const hasProfileChanges = JSON.stringify(currentComparable) !== JSON.stringify(baselineComparable);
    const hasPasswordChanges = Boolean(form.currentPassword.trim() || form.newPassword.trim() || form.confirmPassword.trim());

    if (!hasProfileChanges && !hasPasswordChanges) {
      setEditOpen(false)
      showSuccessToast("No changes detected");
      return;
    }

    setSaving(true);
    try {
      const updatedUser = await updateProfileData({
        firstName: currentComparable.firstName,
        lastName: currentComparable.lastName,
        phoneNumber: currentComparable.phone,
        bio: currentComparable.bio,
        locationProv: currentComparable.locationProv,
        locationCity: currentComparable.locationCity,
        locationBrgy: currentComparable.locationBrgy,
        currentPassword: form.currentPassword.trim(),
        newPassword: form.newPassword.trim(),
      });

      if (user) {
        saveUserData({ ...user, ...updatedUser });
      }
      setProfileUser((prev) => ({ ...(prev ?? updatedUser), ...updatedUser }));

      setForm((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setEditSnapshot(currentComparable);
      setEditOpen(false);
      showSuccessToast("Profile updated successfully");
    } catch (err) {
      const message = typeof err === "string" ? err : (err instanceof Error ? err.message : "Failed to update profile");
      showErrorToast(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivateAccount() {
    if (deactivating) return;

    const confirmed = window.confirm("Deactivate your account? You will be logged out and cannot log in until support reactivates it.");
    if (!confirmed) return;

    setDeactivating(true);
    try {
      await deactivateProfile();
      await clearUserData();
    } catch {
      showErrorToast("Failed to deactivate account");
    } finally {
      setDeactivating(false);
    }
  }

  const initials = `${profileUser?.firstName?.[0] ?? ""}${profileUser?.lastName?.[0] ?? ""}`.toUpperCase() || "?";
  const fullName = profileUser ? `${profileUser.firstName} ${profileUser.lastName}` : "—";
  const locationText = [profileUser?.locationCity, profileUser?.locationProv].filter(Boolean).join(", ") || "Location not set";
  const isVerifiedSeller = !isViewingExternalProfile && (profileUser?.status ?? "").toLowerCase() === "verified";

  // Shared label style
  const lbl = "text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5 block";

  async function handleEditProfileClick() {
    if (isViewingExternalProfile) return;

    if (editOpen) {
      setEditOpen(false);
      return;
    }

    setLoadingEditProfile(true);
    try {
      const payload = await getProfileData();
      setProfileUser(payload.user);
      setUserListings(payload.listings);
      setBookmarkListings(payload.bookmarks);
      saveUserData(payload.user);

      const nextSnapshot: EditableProfileSnapshot = {
        firstName: payload.user.firstName,
        lastName: payload.user.lastName,
        bio: payload.user.bio ?? "",
        phone: payload.user.phoneNumber ?? "",
        locationProv: payload.user.locationProv ?? "",
        locationCity: payload.user.locationCity ?? "",
        locationBrgy: payload.user.locationBrgy ?? "",
      };

      setEditSnapshot(nextSnapshot);
      setForm((prev) => ({
        ...prev,
        ...nextSnapshot,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));

      setEditOpen(true);
    } catch (err) {
      const message = typeof err === "string" ? err : (err instanceof Error ? err.message : "Failed to load latest profile data");
      showErrorToast(message);
      setEditOpen(false);
    } finally {
      setLoadingEditProfile(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-[#0f1117]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-20">

        {/* ── Profile header card ── */}
        <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm overflow-hidden mb-5">

          {/* Cover photo */}
          <div className={cn("relative h-32 bg-linear-to-r from-[#1e2433] via-[#2a3650] to-[#1a2a3a] overflow-hidden group", !isViewingExternalProfile && "cursor-pointer")} onClick={() => !isViewingExternalProfile && cover.trigger()}>
            {cover.src
              ? <Image src={cover.src} alt="Cover" fill className="object-cover" />
              : <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />}
            {!isViewingExternalProfile && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-white text-sm font-medium bg-black/40 px-4 py-2 rounded-full">
                  <Camera className="w-4 h-4" /> {cover.src ? "Change Cover" : "Upload Cover Photo"}
                </div>
              </div>
            )}
            {/* Remove cover button */}
            {!isViewingExternalProfile && cover.src && (
              <button
                onClick={(e) => { e.stopPropagation(); cover.remove(); showSuccessToast("Cover photo removed"); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors opacity-0 group-hover:opacity-100"
                title="Remove cover photo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            {!isViewingExternalProfile && <input ref={cover.inputRef} type="file" accept="image/*" className="hidden" onChange={cover.onFileChange} />}
          </div>

          <div className="px-6 pb-5">
            <div className="flex items-end justify-between -mt-10 mb-3">

              {/* Avatar with change/remove menu */}
              <div className="relative">
                <div
                  className={cn("relative group w-20 h-20", !isViewingExternalProfile && "cursor-pointer")}
                  onClick={() => !isViewingExternalProfile && setShowAvatarMenu((v) => !v)}
                >
                  <div className="w-20 h-20 rounded-full border-4 border-white dark:border-[#1c1f2e] overflow-hidden shadow-md bg-linear-to-br from-[#3a4a6a] to-[#1e2a40] flex items-center justify-center">
                    {avatar.src
                      ? <Image src={avatar.src} alt="Avatar" width={80} height={80} className="object-cover w-full h-full" />
                      : <span className="text-2xl font-bold text-slate-200">{initials}</span>}
                  </div>
                  {!isViewingExternalProfile && (
                    <>
                      <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="absolute bottom-1 right-0 w-6 h-6 bg-stone-800 border-2 border-white dark:border-[#1c1f2e] rounded-full flex items-center justify-center pointer-events-none">
                        <Edit2 className="w-2.5 h-2.5 text-stone-300" />
                      </div>
                    </>
                  )}
                </div>

                {/* Avatar dropdown menu */}
                {!isViewingExternalProfile && showAvatarMenu && (
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
                          onClick={() => { avatar.remove(); setShowAvatarMenu(false); showSuccessToast("Profile photo removed"); }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove Photo
                        </button>
                      )}
                    </div>
                  </>
                )}
                {!isViewingExternalProfile && <input ref={avatar.inputRef} type="file" accept="image/*" className="hidden" onChange={avatar.onFileChange} />}
              </div>

              {/* Action buttons */}
              {!isViewingExternalProfile && <div className="flex items-center gap-2 pb-1">
                <Button variant="outline" size="sm"
                  className="text-xs rounded-full border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300 hover:border-stone-400 dark:hover:border-stone-500 dark:bg-transparent dark:hover:bg-[#252837]"
                  onClick={handleEditProfileClick}
                  disabled={loadingEditProfile}>
                  <Edit2 className="w-3 h-3" />
                  {loadingEditProfile ? "Loading..." : editOpen ? "Cancel" : "Edit Profile"}
                </Button>
              </div>}
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
              {!isViewingExternalProfile && <span className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400"><Mail className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" /> {profileUser?.email}</span>}
              <span className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400"><Calendar className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" /> Last active today</span>
            </div>
          </div>
        </div>

        {/* ── Edit profile form ── */}
        {!isViewingExternalProfile && editOpen && (
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
                <div>
                  <label className={lbl}>Phone Number</label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="09XX XXX XXXX"
                    type="tel"
                    autoComplete="tel-national"
                    inputMode="tel"
                  />
                </div>
                <div>
                  <label className={lbl}>Province</label>
                  <select
                    value={selectedProvCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      const selected = provinces.find((p) => p.code === code);
                      setSelectedProvCode(code);
                      setForm({ ...form, locationProv: selected?.name ?? "", locationCity: "", locationBrgy: "" });
                      setSelectedCityCode("");
                    }}
                    className="w-full bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-stone-800 dark:text-stone-200 outline-none focus:border-stone-400 dark:focus:border-stone-500"
                  >
                    <option value="">Select province</option>
                    {provinces.map((prov) => <option key={prov.code} value={prov.code}>{prov.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>City / Municipality</label>
                  <select
                    value={selectedCityCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      const selected = cities.find((x) => x.code === code);
                      setSelectedCityCode(code);
                      setForm({ ...form, locationCity: selected?.name ?? "", locationBrgy: "" });
                    }}
                    disabled={!selectedProvCode}
                    className="w-full bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-stone-800 dark:text-stone-200 outline-none focus:border-stone-400 dark:focus:border-stone-500 disabled:opacity-60"
                  >
                    <option value="">Select city/municipality</option>
                    {cities.map((city) => <option key={city.code} value={city.code}>{city.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Barangay</label>
                  <select
                    value={form.locationBrgy}
                    onChange={(e) => setForm({ ...form, locationBrgy: e.target.value })}
                    disabled={!selectedCityCode}
                    className="w-full bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-stone-800 dark:text-stone-200 outline-none focus:border-stone-400 dark:focus:border-stone-500 disabled:opacity-60"
                  >
                    <option value="">Select barangay</option>
                    {barangays.map((brgy) => <option key={brgy.code} value={brgy.name}>{brgy.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2 border-t border-stone-200 dark:border-[#2a2d3e] pt-4 mt-1">
                  <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-3 uppercase tracking-wider">Change Password</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={lbl}>Current Password</label>
                      <div className="relative">
                        <Input
                          type={showCurrentPassword ? "text" : "password"}
                          value={form.currentPassword}
                          onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                          placeholder="Required if changing"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={lbl}>New Password</label>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          value={form.newPassword}
                          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                          placeholder="Leave blank to keep"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={lbl}>Confirm New Password</label>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          value={form.confirmPassword}
                          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                          placeholder="Repeat new password"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-stone-200 dark:border-[#2a2d3e]">
                <Button variant="outline" size="sm" className="rounded-full dark:border-[#2a2d3e] dark:text-stone-300 dark:hover:bg-[#252837]" onClick={() => setEditOpen(false)}>Discard</Button>
                <Button size="sm" className="rounded-full bg-stone-900 hover:bg-stone-800 text-white" onClick={handleSave} disabled={saving || uploadingAvatar || uploadingCover}>
                  {saving ? "Saving…" : uploadingAvatar || uploadingCover ? "Uploading image..." : "Save Changes"}
                </Button>
              </div>
              <div className="mt-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-3">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Danger Zone
                </p>
                <p className="text-xs text-red-500/90 dark:text-red-400/80 mb-3">
                  Deactivating your account logs you out and prevents future login.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
                  onClick={handleDeactivateAccount}
                  disabled={deactivating}
                >
                  {deactivating ? "Deactivating..." : "Deactivate Account"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm overflow-hidden">
          {/* Tab bar */}
          {!isViewingExternalProfile && <div className="flex border-b border-stone-200 dark:border-[#2a2d3e]">
            {(["listings", "bookmarks"] as const).map((t) => (
              <button key={t} onClick={() => setProfileTab(t)}
                className={cn("flex-1 py-3.5 text-sm font-medium transition-colors",
                  profileTab === t
                    ? "text-stone-900 dark:text-stone-100 border-b-2 border-stone-900 dark:border-stone-300"
                    : "text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300")}>
                {t === "listings" ? "📦 My Listings" : "🔖 Bookmarked Items"}
              </button>
            ))}
          </div>}

          {/* My Listings */}
          {profileTab === "listings" && (<>
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="flex gap-1">
                {(["all", "active", "sold", "booked"] as const).map((t) => (
                  <button key={t} onClick={() => setListingTab(t)}
                    className={cn("text-xs font-medium px-3 py-1.5 rounded-full transition-colors capitalize",
                      listingTab === t
                        ? "bg-stone-900 dark:bg-stone-200 text-white dark:text-stone-900"
                        : "text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#252837]")}>
                    {t === "all"
                      ? `📋 All (${userListings.length})`
                      : t === "active"
                      ? `🟢 Active (${activeListings.length})`
                      : t === "sold"
                        ? `✅ Sold (${soldListings.length})`
                        : `📝 Booked (${bookedListings.length})`}
                  </button>
                ))}
              </div>
              
            </div>
            {loadingProfile ? (
              <div className="text-center py-14 px-6">
                <p className="font-semibold text-stone-400 text-sm">Loading listings...</p>
              </div>
            ) : allListings.length > 0
              ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">{allListings.map((l) => <ProfileListingCard key={l.id} listing={l} showMeta tab={listingTab} />)}{isVerifiedSeller && <AddListingCard />}</div>
              : <div className="text-center py-14 px-6"><Package className="w-10 h-10 text-stone-200 dark:text-stone-700 mx-auto mb-3" /><p className="font-semibold text-stone-400 text-sm">No listings yet</p>{isVerifiedSeller && <Link href="/create"><Button size="sm" className="mt-4 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs"><Plus className="w-3 h-3" /> Add Listing</Button></Link>}</div>}
          </>)}

          {/* Bookmarked Items */}
          {!isViewingExternalProfile && profileTab === "bookmarks" && (
            loadingProfile
              ? <div className="text-center py-14"><p className="font-semibold text-stone-400 text-sm">Loading bookmarked items...</p></div>
              : bookmarkListings.length > 0
              ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">{bookmarkListings.map((l) => <ProfileListingCard key={l.id} listing={l} />)}</div>
              : <div className="text-center py-14"><Bookmark className="w-10 h-10 text-stone-200 dark:text-stone-700 mx-auto mb-3" /><p className="font-semibold text-stone-400 text-sm">No bookmarked items yet</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
