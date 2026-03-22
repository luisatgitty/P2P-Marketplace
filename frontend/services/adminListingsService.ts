export type AdminListingRecord = {
  id: string;
  title: string;
  type: "SELL" | "RENT" | "SERVICE";
  category: string;
  price: number;
  unit: string;
  location: string;
  status: "AVAILABLE" | "SOLD" | "RENTED" | "COMPLETED" | "HIDDEN";
  seller: string;
  views: number;
  created: string;
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

export async function deleteAdminListing(listingId: string): Promise<void> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/listings/${encodeURIComponent(listingId)}`, {
      method: "DELETE",
      credentials: "include",
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to remove listing.";
    }
  } catch (error: any) {
    throw error?.message || "An unexpected error occurred. Please try again later.";
  }
}
