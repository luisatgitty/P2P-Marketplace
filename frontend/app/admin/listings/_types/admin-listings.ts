import { type ListingTypeU } from '@/types/listings';

export type ListingStatus =
  | 'AVAILABLE'
  | 'UNAVAILABLE'
  | 'SOLD'
  | 'BANNED'
  | 'DELETED';

export type SortDir = 'asc' | 'desc';
export type SortField =
  | 'title'
  | 'type'
  | 'price'
  | 'transactions'
  | 'reviews'
  | 'created'
  | 'updated'
  | 'bannedUntil'
  | 'deletedAt'
  | 'owner'
  | 'status';

export interface AdminListing {
  id: string;
  title: string;
  type: ListingTypeU;
  category: string;
  price: number;
  unit: string;
  location: string;
  status: ListingStatus;
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
  action_by_name: string;
};

export type AdminListingRecord = {
  id: string;
  title: string;
  type: ListingTypeU;
  category: string;
  price: number;
  unit: string;
  location: string;
  status: ListingStatus;
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
  action_by_name: string;
};

export type AdminListingsQuery = {
  search?: string;
  type?: string;
  status?: string;
  category?: string;
  limit?: number;
  offset?: number;
};

export type AdminListingsResponse = {
  listings: AdminListingRecord[];
  total: number;
  limit: number;
  offset: number;
};
