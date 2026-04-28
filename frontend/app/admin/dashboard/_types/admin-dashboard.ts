export type AdminDashboardStats = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  verifiedUsers: number;
  lockedUsers: number;
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
  type: 'SELL' | 'RENT' | 'SERVICE';
  count: number;
  pct: number;
};

export type AdminDashboardPayload = {
  stats: AdminDashboardStats;
  weeklyNewUsers: AdminWeeklyNewUsers[];
  weeklyNewListings: AdminWeeklyNewUsers[];
  listingTypeBreakdown: AdminListingTypeBreakdown[];
  listingTypeTotalActive: number;
};
