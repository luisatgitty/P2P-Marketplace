import type { AdminReport } from '@/types/admin';

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
