'use client';

import { notFound } from 'next/navigation';
import { use } from 'react';

import ListingForm from '@/components/listing-form';
import type { ListingType } from '@/types/listings';

interface PageProps {
  params: Promise<{ type: string }>;
}

const VALID_TYPES: ListingType[] = ['sell', 'rent', 'service'];

export default function CreateListingTypePage({ params }: PageProps) {
  const { type } = use(params);

  if (!VALID_TYPES.includes(type as ListingType)) {
    notFound();
  }

  return <ListingForm type={type as ListingType} />;
}
