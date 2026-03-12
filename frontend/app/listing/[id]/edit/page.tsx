"use client";

import { use } from "react";
import ListingForm, { type FormType } from "@/components/listing-form";
import { getListingById } from "@/lib/listing-data";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditListingPage({ params }: PageProps) {
  const { id }    = use(params);
  const listing   = getListingById(id);

  // Map listing data → form initial values
  const initialData = {
    title:         listing.title,
    category:      listing.category,
    price:         String(listing.price),
    priceUnit:     listing.priceUnit ?? "",
    description:   listing.description,
    locationCity:  listing.locationFull.split(",")[0]?.trim() ?? listing.location,
    locationProv:  listing.locationFull.split(",")[1]?.trim() ?? "",
    locationBrgy:  "",
    condition:     listing.condition ?? "",
    deliveryMethod:listing.deliveryMethod ?? "",
    conditionNotes:"",
    minPeriod:     listing.minRentalPeriod ?? "",
    availability:  listing.availability ?? "",
    deposit:       listing.deposit ?? "",
    amenities:     [],
    turnaround:    listing.turnaround ?? "",
    serviceArea:   listing.serviceArea ?? "",
    inclusions:    listing.includes ?? [""],
  };

  return (
    <ListingForm
      type={listing.type as FormType}
      initialData={initialData}
      isEdit
      listingId={id}
    />
  );
}
