import type { ReportActionType } from '@/types/admin';

export type AdminReportActionPayload = {
  action: ReportActionType;
  reason: string;
};

export async function setAdminReportAction(
  reportId: string,
  payload: AdminReportActionPayload,
): Promise<void> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/reports/${encodeURIComponent(reportId)}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      },
    );

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to apply report action.';
    }
  } catch (error: any) {
    throw (
      error?.message || 'An unexpected error occurred. Please try again later.'
    );
  }
}
