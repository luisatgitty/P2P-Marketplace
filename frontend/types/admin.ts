export type ReportStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED';

export type ReportTarget = 'LISTING' | 'USER';

export type ListingStatus =
  | 'AVAILABLE'
  | 'UNAVAILABLE'
  | 'SOLD'
  | 'HIDDEN'
  | 'BANNED'
  | 'DELETED';

export type ReportActionType =
  | 'DISMISS'
  | 'BAN_LISTING'
  | 'LOCK_3'
  | 'LOCK_7'
  | 'LOCK_30'
  | 'DELETE_LISTING'
  | 'PERMANENT_BAN';

export interface AdminReport {
  id: string;
  status: ReportStatus;
  reporter_id: string;
  reporter: string;
  reporter_email: string;
  reporter_profile_image_url: string;
  reporter_location: string;
  reported_user_id: string;
  reported_name: string;
  reported_email: string;
  reported_location: string;
  target_type: ReportTarget;
  target_name: string;
  target_id: string;
  listing_title: string;
  listing_status: ListingStatus | '';
  listing_image_url: string;
  listing_price: number | null;
  listing_price_unit: string | null;
  listing_owner_id: string;
  listing_owner: string;
  listing_owner_profile_image_url: string;
  listing_owner_location: string;
  reason: string;
  description: string | null;
  created_at: string;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  action_taken: ReportActionType | null;
  action_reason: string | null;
}
