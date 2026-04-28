import type { PostCardProps } from '@/components/PostCard';

export interface ListingExtra {
  description: string;
  condition: string;
  images: string[];
  features: string[];
  transactionCount: number;
  reviewCount: number;
  deliveryMethod: string;
  minPeriod?: string;
  available_from?: string;
  availability?: string;
  deposit?: string;
  amenities?: string[];
  daysOff?: string[];
  timeWindows?: { startTime: string; endTime: string }[];
  turnaround?: string;
  serviceArea?: string;
  arrangement?: string;
  inclusions?: string[];
}

export interface ListingDetailPayload {
  listing: PostCardProps;
  extra: ListingExtra;
  related: PostCardProps[];
  isBookmarked?: boolean;
}

export async function getListingDetailById(
  id: string,
): Promise<ListingDetailPayload> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/listing/${id}`,
      {
        method: 'GET',
        credentials: 'include',
      },
    );

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to fetch listing details.';
    }

    return parsedJson.data as ListingDetailPayload;
  } catch {
    throw 'An unexpected error occurred. Please try again later.';
  }
}
