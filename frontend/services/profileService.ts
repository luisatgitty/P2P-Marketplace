import { PostCardProps } from "@/components/post-card";

export interface ProfileListingItem extends PostCardProps {
  status?: "active" | "sold" | "rented" | "completed" | "hidden" | string;
}

export interface ProfileReviewItem {
  id: string;
  rating: number;
  comment?: string;
  reviewDate: string;
  reviewer: {
    id: string;
    name: string;
    profileImageUrl?: string;
  };
  listing: {
    id: string;
    title: string;
    price: number;
    priceUnit?: string;
    imageUrl: string;
  };
}

export interface ProfilePayload {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    bio?: string;
    locationBrgy?: string;
    locationCity?: string;
    locationProv?: string;
    profileImageUrl?: string;
    coverImageUrl?: string;
    role: string;
    status: string;
    createdAt?: string;
    lastLoginAt?: string;
    overallRating?: number;
    reviewCount?: number;
  };
  listings: ProfileListingItem[];
  bookmarks: ProfileListingItem[];
  reviews: ProfileReviewItem[];
  receivedReviews?: ProfileReviewItem[];
  personalReviews?: ProfileReviewItem[];
}

export interface UpdateProfilePayload {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  bio: string;
  locationProv: string;
  locationCity: string;
  locationBrgy: string;
  currentPassword?: string;
  newPassword?: string;
  profileImage?: {
    name: string;
    mimeType: string;
    data: string;
  };
  coverImage?: {
    name: string;
    mimeType: string;
    data: string;
  };
}

export interface UpdateProfileImagesPayload {
  profileImage?: {
    name: string;
    mimeType: string;
    data: string;
  };
  coverImage?: {
    name: string;
    mimeType: string;
    data: string;
  };
  removeProfileImage?: boolean;
  removeCoverImage?: boolean;
}

export async function getProfileData(): Promise<ProfilePayload> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/me`, {
      method: "GET",
      credentials: "include",
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to fetch profile data.";
    }

    return parsedJson.data as ProfilePayload;
  } catch {
    throw "An unexpected error occurred. Please try again later.";
  }
}

export async function getUserProfileData(userId: string): Promise<ProfilePayload> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/${userId}`, {
      method: "GET",
      credentials: "include",
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to fetch profile data.";
    }

    return parsedJson.data as ProfilePayload;
  } catch {
    throw "An unexpected error occurred. Please try again later.";
  }
}

export async function updateProfileData(payload: UpdateProfilePayload): Promise<ProfilePayload["user"]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to update profile data.";
    }

    return parsedJson.data.user as ProfilePayload["user"];
  } catch (err) {
    if (typeof err === "string") throw err;
    if (err instanceof Error) throw err.message;
    throw "An unexpected error occurred. Please try again later.";
  }
}

export async function deactivateProfile(): Promise<void> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/me`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      const parsedJson = await res.json();
      throw parsedJson?.data?.message || "Failed to deactivate account.";
    }
  } catch (err) {
    if (typeof err === "string") throw err;
    if (err instanceof Error) throw err.message;
    throw "An unexpected error occurred. Please try again later.";
  }
}

export async function updateProfileImages(payload: UpdateProfileImagesPayload): Promise<ProfilePayload["user"]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/me/images`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to update profile images.";
    }

    return parsedJson.data.user as ProfilePayload["user"];
  } catch (err) {
    if (typeof err === "string") throw err;
    if (err instanceof Error) throw err.message;
    throw "An unexpected error occurred. Please try again later.";
  }
}
