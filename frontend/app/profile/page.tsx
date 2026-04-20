"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  MapPin, Mail, Calendar, Eye, EyeOff, Star,
  Edit2, Plus, Package, Bookmark,
  Camera, Trash2, AlertTriangle,
} from "lucide-react";
import { useUser } from "@/utils/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VerificationBadge from "@/components/verification-badge";
import PostCard from "@/components/post-card";
import { toast } from "sonner";
import {
  deactivateProfile,
  getProfileData,
  getUserProfileData,
  type ProfilePageQuery,
  type ProfilePayload,
  updateProfileImages,
  updateProfileData,
  type ProfileListingItem,
  type ProfileReviewItem,
} from "@/services/profileService";
import {
  getBarangaysByCity,
  getCitiesByProvince,
  getProvinces,
  type LocationOption,
} from "@/services/locationService";
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/ui/safe-image";
import { ImageLink } from "@/components/image-link";
import { formatPrice } from "@/utils/string-builder";
import { AUTH_LIMITS, isValidName } from "@/utils/validation";

// ─── Types ────────────────────────────────────────────────────────────────────
type VerificationState = "unverified" | "pending" | "verified" | "rejected";
type ListingTab = "all" | "active" | "sold" | "booked";
type ProfileTab = "listings" | "bookmarks" | "reviews";
type ReviewTab = "received" | "personal";

const SOLD_STATUSES = new Set(["sold"]);
const PROFILE_SCROLL_BATCH_SIZE = 16;

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
    phone: form.phone.replace(/\D/g, "").slice(0, AUTH_LIMITS.phoneLength),
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

function formatMemberSince(createdAt?: string): string {
  if (!createdAt) return "Member since —";

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Member since —";

  return `Member since ${date.toLocaleDateString("en-PH", {
    month: "short",
    year: "numeric",
  })}`;
}

function formatLastActive(lastLoginAt?: string): string {
  if (!lastLoginAt) return "Last active —";

  const date = new Date(lastLoginAt);
  if (Number.isNaN(date.getTime())) return "Last active —";

  const diffMs = Math.max(0, Date.now() - date.getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "Last active just now";
  if (diffMs < hour) {
    const minutes = Math.floor(diffMs / minute);
    return `Last active ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `Last active ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (diffMs < 7 * day) {
    const days = Math.floor(diffMs / day);
    return `Last active ${days} day${days === 1 ? "" : "s"} ago`;
  }

  return `Last active ${date.toLocaleDateString("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  })}`;
}

function formatOverallRating(rating?: number, reviewCount?: number): string {
  const count = reviewCount ?? 0;
  if (count <= 0) return "No ratings yet";

  const safeRating = Number.isFinite(rating) ? Number(rating) : 0;
  return `${safeRating.toFixed(1)} (${count})`;
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

function ProfileReviewCard({ review }: { review: ProfileReviewItem }) {
  const { user } = useUser();
  const reviewerName = (review.reviewer.name ?? "").trim() || "Anonymous Reviewer";
  const isReviewerVerified = (review.reviewer.status ?? "").trim().toLowerCase() === "verified";
  const currentUserId = (user?.userId ?? "").trim();
  const reviewerId = (review.reviewer.id ?? "").trim();
  const reviewerProfileHref = reviewerId !== "" && reviewerId === currentUserId
    ? "/profile"
    : `/profile?userId=${reviewerId}`;
  const listingTypeLabel = (() => {
    const type = (review.listing.type ?? "").trim().toLowerCase();
    if (type === "sell") return "For Sale";
    if (type === "rent") return "For Rent";
    if (type === "service") return "Service";
    return "";
  })();

  return (
    <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ImageLink
            href={reviewerProfileHref}
            src={review.reviewer.profileImageUrl}
            type="profile"
            label={reviewerName}
            className="w-9 h-9 shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">{reviewerName}</p>
              <VerificationBadge verified={isReviewerVerified} />
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500">{review.reviewDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {[1, 2, 3, 4, 5].map((value) => (
            <Star
              key={value}
              className={cn(
                "w-3.5 h-3.5",
                value <= review.rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-stone-300 dark:text-stone-600"
              )}
            />
          ))}
        </div>
      </div>

      {review.comment && review.comment.trim() !== "" && (
        <p className="mt-3 text-sm leading-relaxed text-stone-700 dark:text-stone-200">{review.comment}</p>
      )}

      <div className="mt-3 flex items-center gap-3 rounded-xl border border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f] p-2.5 hover:border-stone-300 dark:hover:border-[#3a3e52] transition-colors">
        <ImageLink
          href={`/listing/${review.listing.id}`}
          src={review.listing.imageUrl}
          type="thumbnail"
          label={review.listing.title}
          className="w-15 h-15"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 line-clamp-1">{review.listing.title}</p>
            {listingTypeLabel && (
              <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                {listingTypeLabel}
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-amber-700 dark:text-amber-500 mt-0.5">
            {formatPrice(review.listing.price)}
            <span className="text-[11px] font-normal text-stone-400 dark:text-stone-500 ml-1">{review.listing.priceUnit}</span>
          </p>
          {/* Listing Location */}
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 truncate">{review.listing.location || "Location unavailable"}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Image upload hook with remove support ────────────────────────────────────
function useImageUpload(
  initialSrc?: string | null,
  onUploaded?: (file: File) => Promise<void>,
  onRemoved?: () => Promise<void>,
) {
  const [src, setSrc] = useState<string | null>(initialSrc ?? null);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSrc(initialSrc ?? null);
    setFile(null);
  }, [initialSrc]);

  function trigger() { inputRef.current?.click(); }

  async function remove() {
    if (onRemoved) {
      await onRemoved();
      setFile(null);
      return;
    }

    setSrc(null);
    setFile(null);
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFile(file);

    if (onUploaded) {
      await onUploaded(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setSrc(result);
      };
      reader.readAsDataURL(file);
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isUserOnline, saveUserData, clearUserData } = useUser();
  const externalUserId = (searchParams.get("userId") ?? "").trim();
  const ownUserId = (user?.userId ?? "").trim();
  const isSelfProfileRequest = externalUserId !== "" && ownUserId !== "" && externalUserId === ownUserId;
  const isViewingExternalProfile = externalUserId !== "" && !isSelfProfileRequest;
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
  const [receivedReviews, setReceivedReviews] = useState<ProfileReviewItem[]>([]);
  const [personalReviews, setPersonalReviews] = useState<ProfileReviewItem[]>([]);
  const [listingTab, setListingTab] = useState<ListingTab>("active");
  const [profileTab, setProfileTab] = useState<ProfileTab>("listings");
  const [reviewTab, setReviewTab] = useState<ReviewTab>("received");
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
  const [listingsTotal, setListingsTotal] = useState(0);
  const [bookmarksTotal, setBookmarksTotal] = useState(0);
  const [receivedReviewsTotal, setReceivedReviewsTotal] = useState(0);
  const [personalReviewsTotal, setPersonalReviewsTotal] = useState(0);
  const [loadingMoreListings, setLoadingMoreListings] = useState(false);
  const [loadingMoreBookmarks, setLoadingMoreBookmarks] = useState(false);
  const [loadingMoreReceivedReviews, setLoadingMoreReceivedReviews] = useState(false);
  const [loadingMorePersonalReviews, setLoadingMorePersonalReviews] = useState(false);

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
      setProfileUser((prev) => ({ ...(prev ?? updatedUser), ...updatedUser }));
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
      setProfileUser((prev) => ({ ...(prev ?? updatedUser), ...updatedUser }));
      showSuccessToast("Cover photo updated");
    } catch (err) {
      const message = typeof err === "string" ? err : (err instanceof Error ? err.message : "Failed to update cover photo");
      showErrorToast(message);
      throw err;
    } finally {
      setUploadingCover(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (uploadingAvatar) return;

    setUploadingAvatar(true);
    try {
      const updatedUser = await updateProfileImages({ removeProfileImage: true });
      if (user) saveUserData({ ...user, ...updatedUser });
      setProfileUser((prev) => ({ ...(prev ?? updatedUser), ...updatedUser }));
      showSuccessToast("Profile photo removed");
    } catch (err) {
      const message = typeof err === "string" ? err : (err instanceof Error ? err.message : "Failed to remove profile photo");
      showErrorToast(message);
      throw err;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverRemove = async () => {
    if (uploadingCover) return;

    setUploadingCover(true);
    try {
      const updatedUser = await updateProfileImages({ removeCoverImage: true });
      if (user) saveUserData({ ...user, ...updatedUser });
      setProfileUser((prev) => ({ ...(prev ?? updatedUser), ...updatedUser }));
      showSuccessToast("Cover photo removed");
    } catch (err) {
      const message = typeof err === "string" ? err : (err instanceof Error ? err.message : "Failed to remove cover photo");
      showErrorToast(message);
      throw err;
    } finally {
      setUploadingCover(false);
    }
  };

  const avatar = useImageUpload(profileUser?.profileImageUrl ?? null, handleAvatarUpload, handleAvatarRemove);
  const cover  = useImageUpload(profileUser?.coverImageUrl ?? null, handleCoverUpload, handleCoverRemove);

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
    if (!editOpen || isViewingExternalProfile) return;

    const loadProvinces = async () => {
      try {
        const data = await getProvinces();
        setProvinces(data);
      } catch {
        showErrorToast("Failed to load provinces");
      }
    };

    loadProvinces();
  }, [editOpen, isViewingExternalProfile]);

  useEffect(() => {
    if (!editOpen || isViewingExternalProfile) return;

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
  }, [editOpen, isViewingExternalProfile, selectedProvCode, form.locationCity]);

  useEffect(() => {
    if (!editOpen || isViewingExternalProfile) return;

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
  }, [editOpen, isViewingExternalProfile, selectedCityCode]);

  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);
      try {
        const initialQuery: ProfilePageQuery = {
          listingsLimit: PROFILE_SCROLL_BATCH_SIZE,
          listingsOffset: 0,
          bookmarksLimit: PROFILE_SCROLL_BATCH_SIZE,
          bookmarksOffset: 0,
          receivedReviewsLimit: PROFILE_SCROLL_BATCH_SIZE,
          receivedReviewsOffset: 0,
          personalReviewsLimit: PROFILE_SCROLL_BATCH_SIZE,
          personalReviewsOffset: 0,
        };

        const payload = isViewingExternalProfile
          ? await getUserProfileData(externalUserId, initialQuery)
          : await getProfileData(initialQuery);

        setProfileUser(payload.user);
        setUserListings(payload.listings);
        setBookmarkListings(isViewingExternalProfile ? [] : payload.bookmarks);
        setReceivedReviews(payload.receivedReviews ?? payload.reviews ?? []);
        setPersonalReviews(payload.personalReviews ?? []);
        setListingsTotal(payload.listingsTotal ?? payload.listings.length);
        setBookmarksTotal(isViewingExternalProfile ? 0 : (payload.bookmarksTotal ?? payload.bookmarks.length));
        setReceivedReviewsTotal(payload.receivedReviewsTotal ?? (payload.receivedReviews ?? payload.reviews ?? []).length);
        setPersonalReviewsTotal(payload.personalReviewsTotal ?? (payload.personalReviews ?? []).length);
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
        if (isViewingExternalProfile) {
          router.replace("/not-found");
          return;
        }
        showErrorToast("Failed to load profile data");
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [isViewingExternalProfile, externalUserId, router]);

  useEffect(() => {
    if (!form.locationProv || provinces.length === 0) return;
    const matched = provinces.find((p) => p.name === form.locationProv);
    if (matched && matched.code !== selectedProvCode) {
      setSelectedProvCode(matched.code);
    }
  }, [form.locationProv, provinces]);

  const activeListings = userListings.filter((l) => (l.status ?? "").toLowerCase() === "available");
  const visibleUserListings = userListings.filter((l) => (l.status ?? "").toLowerCase() !== "deleted");
  const soldListings = visibleUserListings.filter((l) => SOLD_STATUSES.has((l.status ?? "").toLowerCase()));
  const bookedListings = visibleUserListings.filter((l) => {
    const type = (l.type ?? "").toLowerCase();
    return (type === "rent" || type === "service") && Boolean(l.hasActiveBooking);
  });
  const visibleBookmarkListings = bookmarkListings.filter((l) => (l.status ?? "").toLowerCase() !== "deleted");
  const allListings: ProfileListingItem[] = listingTab === "all"
    ? visibleUserListings
    : listingTab === "active"
      ? activeListings
      : listingTab === "sold"
        ? soldListings
        : bookedListings;
  const profileTabs: ProfileTab[] = isViewingExternalProfile
    ? ["listings", "reviews"]
    : ["listings", "bookmarks", "reviews"];
  const hasMoreListings = userListings.length < listingsTotal;
  const hasMoreBookmarks = bookmarkListings.length < bookmarksTotal;
  const hasMoreReceivedReviews = receivedReviews.length < receivedReviewsTotal;
  const hasMorePersonalReviews = personalReviews.length < personalReviewsTotal;

  async function loadMoreListings() {
    if (loadingProfile || loadingMoreListings || !hasMoreListings) return;
    setLoadingMoreListings(true);
    try {
      const query: ProfilePageQuery = {
        listingsLimit: PROFILE_SCROLL_BATCH_SIZE,
        listingsOffset: userListings.length,
      };
      const payload = isViewingExternalProfile
        ? await getUserProfileData(externalUserId, query)
        : await getProfileData(query);
      setUserListings((prev) => [...prev, ...payload.listings]);
      setListingsTotal(payload.listingsTotal ?? listingsTotal);
    } catch {
      showErrorToast("Failed to load more listings");
    } finally {
      setLoadingMoreListings(false);
    }
  }

  async function loadMoreBookmarks() {
    if (isViewingExternalProfile || loadingProfile || loadingMoreBookmarks || !hasMoreBookmarks) return;
    setLoadingMoreBookmarks(true);
    try {
      const payload = await getProfileData({
        bookmarksLimit: PROFILE_SCROLL_BATCH_SIZE,
        bookmarksOffset: bookmarkListings.length,
      });
      setBookmarkListings((prev) => [...prev, ...payload.bookmarks]);
      setBookmarksTotal(payload.bookmarksTotal ?? bookmarksTotal);
    } catch {
      showErrorToast("Failed to load more bookmarks");
    } finally {
      setLoadingMoreBookmarks(false);
    }
  }

  async function loadMoreReviews(target: ReviewTab) {
    if (loadingProfile) return;

    if (target === "received") {
      if (loadingMoreReceivedReviews || !hasMoreReceivedReviews) return;
      setLoadingMoreReceivedReviews(true);
      try {
        const query: ProfilePageQuery = {
          receivedReviewsLimit: PROFILE_SCROLL_BATCH_SIZE,
          receivedReviewsOffset: receivedReviews.length,
        };
        const payload = isViewingExternalProfile
          ? await getUserProfileData(externalUserId, query)
          : await getProfileData(query);
        const next = payload.receivedReviews ?? payload.reviews ?? [];
        setReceivedReviews((prev) => [...prev, ...next]);
        setReceivedReviewsTotal(payload.receivedReviewsTotal ?? receivedReviewsTotal);
      } catch {
        showErrorToast("Failed to load more reviews");
      } finally {
        setLoadingMoreReceivedReviews(false);
      }
      return;
    }

    if (loadingMorePersonalReviews || !hasMorePersonalReviews) return;
    setLoadingMorePersonalReviews(true);
    try {
      const query: ProfilePageQuery = {
        personalReviewsLimit: PROFILE_SCROLL_BATCH_SIZE,
        personalReviewsOffset: personalReviews.length,
      };
      const payload = isViewingExternalProfile
        ? await getUserProfileData(externalUserId, query)
        : await getProfileData(query);
      const next = payload.personalReviews ?? [];
      setPersonalReviews((prev) => [...prev, ...next]);
      setPersonalReviewsTotal(payload.personalReviewsTotal ?? personalReviewsTotal);
    } catch {
      showErrorToast("Failed to load more reviews");
    } finally {
      setLoadingMorePersonalReviews(false);
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      if (loadingProfile) return;

      const reachedBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 320;
      if (!reachedBottom) return;

      if (profileTab === "listings" && hasMoreListings) {
        void loadMoreListings();
        return;
      }

      if (profileTab === "bookmarks" && !isViewingExternalProfile && hasMoreBookmarks) {
        void loadMoreBookmarks();
        return;
      }

      if (profileTab === "reviews" && reviewTab === "received" && hasMoreReceivedReviews) {
        void loadMoreReviews("received");
        return;
      }

      if (profileTab === "reviews" && reviewTab === "personal" && hasMorePersonalReviews) {
        void loadMoreReviews("personal");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [
    hasMoreBookmarks,
    hasMoreListings,
    hasMorePersonalReviews,
    hasMoreReceivedReviews,
    isViewingExternalProfile,
    loadMoreBookmarks,
    loadMoreListings,
    loadMoreReviews,
    loadingProfile,
    profileTab,
    reviewTab,
  ]);

  async function handleSave() {
    const firstNameError = isValidName(form.firstName.trim(), "First name");
    if (firstNameError) {
      showErrorToast(firstNameError);
      return;
    }

    const lastNameError = isValidName(form.lastName.trim(), "Last name");
    if (lastNameError) {
      showErrorToast(lastNameError);
      return;
    }

    if (form.bio.trim().length > AUTH_LIMITS.profileBioMaxLength) {
      showErrorToast(`Bio must not exceed ${AUTH_LIMITS.profileBioMaxLength} characters`);
      return;
    }

    const normalizedPhone = form.phone.replace(/\D/g, "").slice(0, AUTH_LIMITS.phoneLength);
    if (normalizedPhone !== "") {
      if (normalizedPhone.length !== AUTH_LIMITS.phoneLength) {
        showErrorToast(`Phone number must be exactly ${AUTH_LIMITS.phoneLength} digits`);
        return;
      }
      if (!normalizedPhone.startsWith("09")) {
        showErrorToast("Phone number must start with 09");
        return;
      }
    }

    if (form.currentPassword.length > AUTH_LIMITS.passwordMaxLength) {
      showErrorToast(`Current password must not exceed ${AUTH_LIMITS.passwordMaxLength} characters`);
      return;
    }

    if (form.newPassword.length > AUTH_LIMITS.passwordMaxLength) {
      showErrorToast(`New password must not exceed ${AUTH_LIMITS.passwordMaxLength} characters`);
      return;
    }

    if (form.confirmPassword.length > AUTH_LIMITS.passwordMaxLength) {
      showErrorToast(`Confirm password must not exceed ${AUTH_LIMITS.passwordMaxLength} characters`);
      return;
    }

    if (form.newPassword && form.newPassword.length < AUTH_LIMITS.passwordMinLength) {
      showErrorToast(`New password must be at least ${AUTH_LIMITS.passwordMinLength} characters`);
      return;
    }

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

  const fullName = profileUser ? `${profileUser.firstName} ${profileUser.lastName}` : "—";
  const locationText = [profileUser?.locationCity, profileUser?.locationProv].filter(Boolean).join(", ") || "Location not set";
  const memberSinceText = formatMemberSince(profileUser?.createdAt);
  const lastActiveText = formatLastActive(profileUser?.lastLoginAt);
  const overallRatingText = formatOverallRating(profileUser?.overallRating, profileUser?.reviewCount);
  const hasOverallRating = (profileUser?.reviewCount ?? 0) > 0;
  const isVerifiedSeller = !isViewingExternalProfile && (profileUser?.status ?? "").toLowerCase() === "verified";
  const profileTargetUserId = isViewingExternalProfile ? externalUserId : (user?.userId ?? "");
  const isProfileOnline = profileTargetUserId ? isUserOnline(profileTargetUserId) : false;

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
      setReceivedReviews(payload.receivedReviews ?? payload.reviews ?? []);
      setPersonalReviews(payload.personalReviews ?? []);
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
    <div className="min-h-fit bg-[#faf6f0] dark:bg-[#111827]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Profile header card ── */}
        <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] shadow-sm overflow-hidden mb-4">

          {/* Cover photo */}
          <div className={cn("relative aspect-7/1 bg-linear-to-r from-[#1a0e00] via-[#1a2235] to-[#0b0f1a] overflow-hidden group", !isViewingExternalProfile && "cursor-pointer")} onClick={() => !isViewingExternalProfile && cover.trigger()}>
            {cover.src
              ? <SafeImage
                src={cover.src}
                type="cover"
                alt={`${fullName}'s cover photo`}
                fill
              />
              : <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
                  backgroundSize: "28px 28px"
                }}
              />}
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
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await cover.remove();
                  } catch {
                    // toast already handled in remove flow
                  }
                }}
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
                  <SafeImage
                    src={avatar.src ?? undefined}
                    type="profile"
                    alt={`${fullName}'s profile photo`}
                    width={80}
                    height={80}
                    className="w-20 h-20 border-4 border-white dark:border-slate-900 overflow-hidden shadow-md flex items-center justify-center"
                  />
                  {isProfileOnline && (
                    <span className="absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 border-3 border-white dark:border-[#1c1f2e]" />
                  )}
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
                          onClick={async () => {
                            try {
                              await avatar.remove();
                            } catch {
                              // toast already handled in remove flow
                            } finally {
                              setShowAvatarMenu(false);
                            }
                          }}
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
              <h1 className="text-md md:text-xl font-bold text-stone-900 dark:text-stone-100">{fullName}</h1>
              <VerificationBadge verified={verificationState === "verified"} size={16} />
            </div>
            <p className="text-sm text-stone-400 dark:text-stone-500 mb-3">{profileUser?.bio}</p>

            {/* Meta row */}
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              <span className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400"><MapPin className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" /> {locationText}</span>
              {!isViewingExternalProfile && <span className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400"><Mail className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" /> {profileUser?.email}</span>}

              <span className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400"><Calendar className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" /> {memberSinceText}</span>
              <span className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400"><Calendar className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" /> {lastActiveText}</span>
              <span className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400"><Star className={cn("w-3.5 h-3.5", hasOverallRating ? "fill-amber-400 text-amber-400" : "text-stone-400 dark:text-stone-500")} /> {overallRatingText}</span>
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
                <div><label className={lbl}>First Name</label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value.slice(0, AUTH_LIMITS.nameMaxLength) })} minLength={AUTH_LIMITS.nameMinLength} maxLength={AUTH_LIMITS.nameMaxLength} /></div>
                <div><label className={lbl}>Last Name</label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value.slice(0, AUTH_LIMITS.nameMaxLength) })} minLength={AUTH_LIMITS.nameMinLength} maxLength={AUTH_LIMITS.nameMaxLength} /></div>
                <div className="col-span-2">
                  <label className={lbl}>Bio</label>
                  <textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value.slice(0, AUTH_LIMITS.profileBioMaxLength) })}
                    maxLength={AUTH_LIMITS.profileBioMaxLength}
                    placeholder="Tell buyers and sellers a bit about yourself…"
                    className="w-full bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-stone-800 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 outline-none focus:border-stone-400 dark:focus:border-stone-500 resize-none" />
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">{form.bio.length} / {AUTH_LIMITS.profileBioMaxLength}</p>
                </div>
                <div>
                  <label className={lbl}>Phone Number</label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, AUTH_LIMITS.phoneLength) })}
                    placeholder="09XX XXX XXXX"
                    type="tel"
                    autoComplete="tel-national"
                    inputMode="tel"
                    maxLength={AUTH_LIMITS.phoneLength}
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
                          onChange={(e) => setForm({ ...form, currentPassword: e.target.value.slice(0, AUTH_LIMITS.passwordMaxLength) })}
                          placeholder="Required if changing"
                          maxLength={AUTH_LIMITS.passwordMaxLength}
                          className="pr-9"
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
                          onChange={(e) => setForm({ ...form, newPassword: e.target.value.slice(0, AUTH_LIMITS.passwordMaxLength) })}
                          placeholder="Leave blank to keep"
                          maxLength={AUTH_LIMITS.passwordMaxLength}
                          className="pr-9"
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
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value.slice(0, AUTH_LIMITS.passwordMaxLength) })}
                        placeholder="Repeat new password"
                        maxLength={AUTH_LIMITS.passwordMaxLength}
                      />
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
          <div className="flex border-b border-stone-200 dark:border-[#2a2d3e]">
            {profileTabs.map((t) => (
              <button key={t} onClick={() => setProfileTab(t)}
                className={cn("flex-1 py-3.5 text-sm font-medium transition-colors",
                  profileTab === t
                    ? "text-stone-900 dark:text-stone-100 border-b-2 border-stone-900 dark:border-stone-300"
                    : "text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300")}>
                {t === "listings"
                  ? "📦 Listing"
                  : t === "bookmarks"
                    ? "🔖 Bookmark"
                    : "⭐ Review"}
              </button>
            ))}
          </div>

          {/* My Listings */}
          {profileTab === "listings" && (<>
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="flex gap-1">
                {(["all", "active", "sold", "booked"] as const).map((tab) => (
                  <button key={tab} onClick={() => setListingTab(tab)}
                    className={cn("tab-page-base",
                      listingTab === tab
                        ? "tab-active"
                        : "tab-inactive")}>
                    {tab === "all"
                      ? `All (${visibleUserListings.length})`
                      : tab === "active"
                      ? `Active (${activeListings.length})`
                      : tab === "sold"
                        ? `Sold (${soldListings.length})`
                        : `Booked (${bookedListings.length})`}
                  </button>
                ))}
              </div>
              
            </div>
            {loadingProfile ? (
              <div className="text-center py-14 px-6">
                <p className="font-semibold text-stone-400 text-sm">Loading listings...</p>
              </div>
            ) : (allListings.length > 0) ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
                {allListings.map((l) => <PostCard key={l.id} {...l} />)}{isVerifiedSeller && <AddListingCard />}
              </div>
            ) : (
              <div className="text-center py-14 px-6">
                <Package className="w-10 h-10 text-stone-200 dark:text-stone-700 mx-auto mb-3" />
                <p className="font-semibold text-stone-400 text-sm">No listings yet</p>
                {isVerifiedSeller && (
                  <Link href="/create">
                    <Button size="sm" className="mt-4 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs">
                      <Plus className="w-3 h-3" /> Add Listing
                    </Button>
                  </Link>
                )}
              </div>
            )}
            {!loadingProfile && hasMoreListings && (
              <p className="pb-4 text-center text-xs text-stone-400 dark:text-stone-500">Scroll down to load more listings...</p>
            )}
            {loadingMoreListings && (
              <p className="pb-4 text-center text-xs text-stone-400 dark:text-stone-500">Loading more listings...</p>
            )}
          </>)}

          {/* Bookmarked Items */}
          {!isViewingExternalProfile && profileTab === "bookmarks" && (
            loadingProfile
              ? <div className="text-center py-14"><p className="font-semibold text-stone-400 text-sm">Loading bookmarked items...</p></div>
              : visibleBookmarkListings.length > 0
              ? <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">{visibleBookmarkListings.map((l) => <PostCard key={l.id} {...l} />)}</div>
                {hasMoreBookmarks && (
                  <p className="pb-4 text-center text-xs text-stone-400 dark:text-stone-500">Scroll down to load more bookmarks...</p>
                )}
                {loadingMoreBookmarks && (
                  <p className="pb-4 text-center text-xs text-stone-400 dark:text-stone-500">Loading more bookmarks...</p>
                )}
              </>
              : <div className="text-center py-14"><Bookmark className="w-10 h-10 text-stone-200 dark:text-stone-700 mx-auto mb-3" /><p className="font-semibold text-stone-400 text-sm">No bookmarked items yet</p></div>
          )}

          {/* Reviews */}
          {profileTab === "reviews" && (
            <>
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex gap-1">
                  {([
                    { key: "received", label: `Reviews by Others (${receivedReviews.length})` },
                    { key: "personal", label: `Personal Reviews (${personalReviews.length})` },
                  ] as const).map((tabItem) => (
                    <button
                      key={tabItem.key}
                      onClick={() => setReviewTab(tabItem.key)}
                      className={cn(
                        "tab-page-base",
                        reviewTab === tabItem.key
                          ? "tab-active"
                          : "tab-inactive"
                      )}
                    >
                      {tabItem.label}
                    </button>
                  ))}
                </div>
              </div>

              {loadingProfile ? (
                <div className="text-center py-14"><p className="font-semibold text-stone-400 text-sm">Loading reviews...</p></div>
              ) : (reviewTab === "received" ? receivedReviews : personalReviews).length > 0 ? (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
                  {(reviewTab === "received" ? receivedReviews : personalReviews).map((review) => (
                    <ProfileReviewCard key={`${reviewTab}-${review.id}`} review={review} />
                  ))}
                </div>
                {((reviewTab === "received" && hasMoreReceivedReviews) || (reviewTab === "personal" && hasMorePersonalReviews)) && (
                  <p className="pb-4 text-center text-xs text-stone-400 dark:text-stone-500">Scroll down to load more reviews...</p>
                )}
                {((reviewTab === "received" && loadingMoreReceivedReviews) || (reviewTab === "personal" && loadingMorePersonalReviews)) && (
                  <p className="pb-4 text-center text-xs text-stone-400 dark:text-stone-500">Loading more reviews...</p>
                )}
                </>
              ) : (
                <div className="text-center py-14 px-6">
                  <Star className="w-10 h-10 text-stone-200 dark:text-stone-700 mx-auto mb-3" />
                  <p className="font-semibold text-stone-400 text-sm">
                    {reviewTab === "received" ? "No reviews by others yet" : "No personal reviews yet"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
