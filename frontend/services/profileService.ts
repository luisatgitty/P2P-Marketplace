import { PostCardProps } from "@/components/post-card";

export interface ProfileListingItem extends PostCardProps {
  status?: "active" | "sold" | "rented" | "completed" | "hidden" | string;
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
  };
  listings: ProfileListingItem[];
  bookmarks: ProfileListingItem[];
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
