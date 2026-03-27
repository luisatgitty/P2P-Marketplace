import { ListingFormData } from "@/components/listing-form";

export type ListingEditData = Partial<ListingFormData> & {
  type: "sell" | "rent" | "service";
};

type ListingEditApiData = Omit<ListingEditData, "timeWindows"> & {
  timeWindows?: Array<
    { startTime?: string; endTime?: string } | { start?: string; end?: string }
  >;
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

    const raw = parsedJson.data as ListingEditApiData;

    const normalizedTimeWindows = (raw.timeWindows ?? [])
      .map((slot) => {
        const start = "start" in slot ? slot.start : slot.startTime;
        const end = "end" in slot ? slot.end : slot.endTime;
        if (!start || !end) return null;
        return { start, end };
      })
      .filter((slot): slot is { start: string; end: string } => slot !== null);

    return {
      ...raw,
      timeWindows: normalizedTimeWindows,
    } as ListingEditData;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch listing edit data.";
    throw new Error(message);
  }
}
