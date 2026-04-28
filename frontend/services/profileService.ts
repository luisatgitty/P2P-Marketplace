import type { PostCardProps } from '@/components/PostCard';

export interface ProfileListingItem extends PostCardProps {
  status?: 'active' | 'sold' | 'rented' | 'completed' | 'hidden' | string;
  hasActiveBooking?: boolean;
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
    status?: string;
  };
  listing: {
    id: string;
    title: string;
    price: number;
    priceUnit?: string;
    imageUrl: string;
    type?: string;
    location?: string;
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
  listingsTotal?: number;
  bookmarksTotal?: number;
  receivedReviewsTotal?: number;
  personalReviewsTotal?: number;
}

export interface ProfilePageQuery {
  listingsLimit?: number;
  listingsOffset?: number;
  bookmarksLimit?: number;
  bookmarksOffset?: number;
  receivedReviewsLimit?: number;
  receivedReviewsOffset?: number;
  personalReviewsLimit?: number;
  personalReviewsOffset?: number;
}

export function appendProfileQueryParams(url: URL, query?: ProfilePageQuery) {
  if (!query) return;

  const entries = Object.entries(query) as Array<
    [keyof ProfilePageQuery, number | undefined]
  >;
  for (const [key, value] of entries) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      url.searchParams.set(key, String(value));
    }
  }
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  bio?: string;
  locationProv?: string;
  locationCity?: string;
  locationBrgy?: string;
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

export async function getUserProfileData(
  userId: string,
  query?: ProfilePageQuery,
): Promise<ProfilePayload> {
  try {
    const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/profile/${userId}`);
    appendProfileQueryParams(url, query);

    const res = await fetch(url.toString(), {
      method: 'GET',
      credentials: 'include',
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to fetch profile data.';
    }

    return parsedJson.data as ProfilePayload;
  } catch {
    throw 'An unexpected error occurred. Please try again later.';
  }
}

export async function updateProfileData(
  payload: UpdateProfilePayload,
): Promise<ProfilePayload['user']> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to update profile data.';
    }

    return parsedJson.data.user as ProfilePayload['user'];
  } catch (err) {
    if (typeof err === 'string') throw err;
    if (err instanceof Error) throw err.message;
    throw 'An unexpected error occurred. Please try again later.';
  }
}

export async function updateProfileImages(
  payload: UpdateProfileImagesPayload,
): Promise<ProfilePayload['user']> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/profile/me/images`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      },
    );

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to update profile images.';
    }

    return parsedJson.data.user as ProfilePayload['user'];
  } catch (err) {
    if (typeof err === 'string') throw err;
    if (err instanceof Error) throw err.message;
    throw 'An unexpected error occurred. Please try again later.';
  }
}
