"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ListingType } from "@/types/listings";
import ListingForm from "@/components/listing-form";
import { getListingEditById, type ListingEditData } from "@/services/listingEditService";

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ListingEditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await getListingEditById(id);
        if (!mounted) return;
        setData(result);
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : "Failed to load listing for editing.";
        setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 dark:bg-[#0f1117]">
        <p className="text-stone-600 dark:text-stone-400 font-medium">Loading listing data...</p>
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 dark:bg-[#0f1117] px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-stone-700 dark:text-stone-200 font-semibold">Unable to load listing for edit</p>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">{error || "Please try again."}</p>
        </div>
      </div>
    );
  }

  const initialData = {
    title: data.title ?? "",
    category: data.category ?? "",
    price: typeof data.price === "number" ? String(data.price) : "",
    priceUnit: data.priceUnit ?? "",
    description: data.description ?? "",
    highlights: data.highlights ?? [],
    locationCity: data.locationCity ?? "",
    locationProv: data.locationProv ?? "",
    locationBrgy: data.locationBrgy ?? "",
    condition: data.condition ?? "",
    deliveryMethod: data.deliveryMethod ?? "",
    minPeriod: data.minPeriod ?? "",
    availability: data.availability ?? "",
    dayoffs: data.dayoffs ?? [],
    timeWindows: data.timeWindows ?? [],
    deposit: data.deposit ?? "",
    amenities: data.amenities ?? [],
    turnaround: data.turnaround ?? "",
    serviceArea: data.serviceArea ?? "",
    arrangement: data.arrangement ?? "",
    inclusions: data.inclusions ?? [""],
  };

  return (
    <ListingForm
      type={data.type as ListingType}
      initialData={initialData}
      isEdit
      listingId={id}
    />
  );
}
