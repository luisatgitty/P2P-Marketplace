export type AdminPendingCountsResponse = {
  pendingReports: number;
  pendingVerifications: number;
};

export async function getAdminPendingCounts(): Promise<AdminPendingCountsResponse> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/pending-counts`,
      {
        method: 'GET',
        credentials: 'include',
      },
    );

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to fetch admin pending counts.';
    }

    return {
      pendingReports: Number(parsedJson?.data?.pendingReports ?? 0),
      pendingVerifications: Number(parsedJson?.data?.pendingVerifications ?? 0),
    };
  } catch {
    throw 'An unexpected error occurred. Please try again later.';
  }
}
