import { type ListingTypeU } from '@/types/listings';

export type TransactionStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type SortDir = 'asc' | 'desc';
export type SortField =
  | 'client'
  | 'owner'
  | 'listing'
  | 'scheduleEnd'
  | 'totalPrice'
  | 'completedAt'
  | 'createdAt';

export type AdminTransactionRecord = {
  id: string;
  listing_id: string;
  listing_type: ListingTypeU;
  listing_title: string;
  listing_price_unit: string;
  listing_image_url: string;

  client_user_id: string;
  client_full_name: string;
  client_location: string;
  client_profile_image_url: string;

  owner_user_id: string;
  owner_full_name: string;
  owner_location: string;
  owner_profile_image_url: string;

  start_date?: string | null;
  end_date?: string | null;
  selected_time_window?: string;

  total_price: number;
  schedule_units: number;
  provider_agreed: boolean;
  client_agreed: boolean;

  status: TransactionStatus;
  completed_at?: string | null;
  created_at: string;
};

export type AdminTransactionsQuery = {
  search?: string;
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

export type AdminTransactionsResponse = {
  transactions: AdminTransactionRecord[];
  total: number;
  limit: number;
  offset: number;
};
