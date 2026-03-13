import { ListingFormData } from "@/components/listing-form";

export type ListingEditData = Partial<ListingFormData> & {
  type: "sell" | "rent" | "service";
};

export async function getListingEditById(id: string): Promise<ListingEditData> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listing/${id}/edit`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const parsedJson = await response.json();
    if (!response.ok) {
      throw new Error(parsedJson?.data?.message || "Failed to fetch listing edit data.");
    }

    return parsedJson.data as ListingEditData;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch listing edit data.";
    throw new Error(message);
  }
}
