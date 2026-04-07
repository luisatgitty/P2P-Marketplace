export type AdminListingRecord = {
  id: string;
  title: string;
  type: "SELL" | "RENT" | "SERVICE";
  category: string;
  price: number;
  unit: string;
  location: string;
  status: "AVAILABLE" | "UNAVAILABLE" | "SOLD" | "BANNED" | "DELETED";
  listing_image_url: string;
  seller_id: string;
  seller: string;
  seller_location: string;
  seller_profile_image_url: string;
  transaction_count: number;
  review_count: number;
  created: string;
  updated_at: string;
  banned_until: string | null;
  deleted_at: string | null;
};

export async function getAdminListings(): Promise<AdminListingRecord[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/listings`, {
      method: "GET",
      credentials: "include",
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to fetch listings.";
    }

    return (parsedJson?.data?.listings ?? []) as AdminListingRecord[];
  } catch {
    throw "An unexpected error occurred. Please try again later.";
  }
}

export async function deleteAdminListing(listingId: string): Promise<{ listingId: string; status: "DELETED" }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/listings/${encodeURIComponent(listingId)}`, {
      method: "DELETE",
      credentials: "include",
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to remove listing.";
    }

    return {
      listingId: parsedJson?.data?.listingId,
      status: parsedJson?.data?.status,
    };
  } catch (error: any) {
    throw error?.message || "An unexpected error occurred. Please try again later.";
  }
}

export async function toggleAdminListingVisibility(listingId: string): Promise<{ listingId: string; status: "BANNED" | "UNAVAILABLE" }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/listings/${encodeURIComponent(listingId)}/toggle-visibility`, {
      method: "PATCH",
      credentials: "include",
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to update listing visibility.";
    }

    return {
      listingId: parsedJson?.data?.listingId,
      status: parsedJson?.data?.status,
    };
  } catch (error: any) {
    throw error?.message || "An unexpected error occurred. Please try again later.";
  }
}
