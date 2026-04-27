// TODO: Make this service more specific
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

export type AdminReportRecord = AdminReport;

export type AdminReportsQuery = {
  search?: string;
  status?: string;
  reason?: string;
  limit?: number;
  offset?: number;
};

export type AdminReportsResponse = {
  reports: AdminReportRecord[];
  total: number;
  limit: number;
  offset: number;
};

export async function getAdminReports(
  query?: AdminReportsQuery,
): Promise<AdminReportsResponse> {
  try {
    const params = new URLSearchParams();
    if (query?.search) params.set('search', query.search);
    if (query?.status) params.set('status', query.status);
    if (query?.reason) params.set('reason', query.reason);
    if (typeof query?.limit === 'number')
      params.set('limit', String(query.limit));
    if (typeof query?.offset === 'number')
      params.set('offset', String(query.offset));

    const querySuffix = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/reports${querySuffix}`,
      {
        method: 'GET',
        credentials: 'include',
      },
    );

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to fetch reports.';
    }

    return {
      reports: (parsedJson?.data?.reports ?? []) as AdminReportRecord[],
      total: Number(parsedJson?.data?.total ?? 0),
      limit: Number(parsedJson?.data?.limit ?? query?.limit ?? 0),
      offset: Number(parsedJson?.data?.offset ?? query?.offset ?? 0),
    };
  } catch {
    throw 'An unexpected error occurred. Please try again later.';
  }
}
