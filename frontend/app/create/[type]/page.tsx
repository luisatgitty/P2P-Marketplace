"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import ListingForm, { type FormType } from "@/components/listing-form";

interface PageProps {
  params: Promise<{ type: string }>;
}

const VALID_TYPES: FormType[] = ["sell", "rent", "service"];

export default function CreateListingTypePage({ params }: PageProps) {
  const { type } = use(params);

  if (!VALID_TYPES.includes(type as FormType)) {
    notFound();
  }

  return <ListingForm type={type as FormType} />;
}
