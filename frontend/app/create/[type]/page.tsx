'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import ListingForm from '@/components/listing-form';
import { ListingType } from '@/types/listings';

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
