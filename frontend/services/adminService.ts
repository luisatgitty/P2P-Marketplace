export type AdminDashboardStats = {
  totalUsers: number;
  newUsersThisWeek: number;
  newUsersLastWeek: number;
  activeListings: number;
  newListingsThisWeek: number;
  newListingsLastWeek: number;
  pendingReports: number;
  pendingReportsToday: number;
  pendingReportsYesterday: number;
  pendingVerifications: number;
  pendingVerificationsToday: number;
  pendingVerificationsYesterday: number;
};

export type AdminWeeklyNewUsers = {
  day: string;
  count: number;
};

export type AdminListingTypeBreakdown = {
  type: "SELL" | "RENT" | "SERVICE";
  count: number;
  pct: number;
};

export type AdminDashboardPayload = {
  stats: AdminDashboardStats;
  weeklyNewUsers: AdminWeeklyNewUsers[];
  listingTypeBreakdown: AdminListingTypeBreakdown[];
  listingTypeTotalActive: number;
};

export async function getAdminDashboardStats(): Promise<AdminDashboardPayload> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/dashboard/stats`, {
      method: "GET",
      credentials: "include",
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to fetch admin dashboard stats.";
    }

    return {
      stats: (parsedJson?.data?.stats ?? {}) as AdminDashboardStats,
      weeklyNewUsers: (parsedJson?.data?.weeklyNewUsers ?? []) as AdminWeeklyNewUsers[],
      listingTypeBreakdown: (parsedJson?.data?.listingTypeBreakdown ?? []) as AdminListingTypeBreakdown[],
      listingTypeTotalActive: Number(parsedJson?.data?.listingTypeTotalActive ?? 0),
    };
  } catch {
    throw "An unexpected error occurred. Please try again later.";
  }
}
