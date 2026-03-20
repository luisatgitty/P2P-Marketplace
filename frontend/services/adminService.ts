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

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/dashboard/stats`, {
      method: "GET",
      credentials: "include",
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to fetch admin dashboard stats.";
    }

    return (parsedJson?.data?.stats ?? {}) as AdminDashboardStats;
  } catch {
    throw "An unexpected error occurred. Please try again later.";
  }
}
