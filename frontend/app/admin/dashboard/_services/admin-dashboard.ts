import {
  type AdminDashboardPayload,
  type AdminDashboardStats,
  type AdminListingTypeBreakdown,
  type AdminWeeklyNewUsers,
} from "../_types/admin-dashboard";

export async function getAdminDashboardStats(): Promise<AdminDashboardPayload> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/dashboard/stats`,
      {
        method: 'GET',
        credentials: 'include',
      },
    );

    const parsedJson = await res.json();
    if (!res.ok) {
      throw (
        parsedJson?.data?.message || 'Failed to fetch admin dashboard stats.'
      );
    }

    return {
      stats: (parsedJson?.data?.stats ?? {}) as AdminDashboardStats,
      weeklyNewUsers: (parsedJson?.data?.weeklyNewUsers ??
        []) as AdminWeeklyNewUsers[],
      weeklyNewListings: (parsedJson?.data?.weeklyNewListings ??
        []) as AdminWeeklyNewUsers[],
      listingTypeBreakdown: (parsedJson?.data?.listingTypeBreakdown ??
        []) as AdminListingTypeBreakdown[],
      listingTypeTotalActive: Number(
        parsedJson?.data?.listingTypeTotalActive ?? 0,
      ),
    };
  } catch {
    throw 'An unexpected error occurred. Please try again later.';
  }
}
