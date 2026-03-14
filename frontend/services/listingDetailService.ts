import { PostCardProps } from "@/components/post-card";

export interface ListingExtra {
  description: string;
  condition: string;
  images: string[];
  features: string[];
  views: number;
  offers: number;
  deliveryMethod: string;
  minPeriod?: string;
  availability?: string;
  deposit?: string;
  amenities?: string[];
  turnaround?: string;
  serviceArea?: string;
  inclusions?: string[];
}

export interface ListingDetailPayload {
  listing: PostCardProps;
  extra: ListingExtra;
  related: PostCardProps[];
}

export async function getListingDetailById(id: string): Promise<ListingDetailPayload> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listing/${id}`, {
      method: "GET",
      credentials: "include",
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to fetch listing details.";
    }

    return parsedJson.data as ListingDetailPayload;
  } catch {
    throw "An unexpected error occurred. Please try again later.";
  }
}
