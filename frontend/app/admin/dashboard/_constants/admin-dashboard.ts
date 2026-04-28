import {
  Flag,
  Home,
  Package,
  ShieldCheck,
  ShoppingBag,
  Users,
  Wrench,
} from 'lucide-react';

import {
  type AdminDashboardStats,
  type AdminListingTypeBreakdown,
  type AdminWeeklyNewUsers,
} from "../_types/admin-dashboard";

export const STAT_CARD_META = [
  {
    key: 'totalUsers',
    label: 'Total Users',
    Icon: Users,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    href: '/admin/users',
  },
  {
    key: 'activeListings',
    label: 'Active Listings',
    Icon: Package,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    href: '/admin/listings',
  },
  {
    key: 'pendingReports',
    label: 'Pending Reports',
    Icon: Flag,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
    href: '/admin/reports',
  },
  {
    key: 'pendingVerifications',
    label: 'Pending Verifications',
    Icon: ShieldCheck,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    href: '/admin/verifications',
  },
] as const;

export const EMPTY_STATS: AdminDashboardStats = {
  totalUsers: 0,
  activeUsers: 0,
  inactiveUsers: 0,
  verifiedUsers: 0,
  lockedUsers: 0,
  newUsersThisWeek: 0,
  newUsersLastWeek: 0,
  activeListings: 0,
  newListingsThisWeek: 0,
  newListingsLastWeek: 0,
  pendingReports: 0,
  pendingReportsToday: 0,
  pendingReportsYesterday: 0,
  pendingVerifications: 0,
  pendingVerificationsToday: 0,
  pendingVerificationsYesterday: 0,
};

export const LISTING_TYPE_META: Record<
  AdminListingTypeBreakdown['type'],
  {
    label: string;
    color: string;
    text: string;
    Icon: typeof ShoppingBag;
  }
> = {
  SELL: {
    label: 'For Sale',
    color: 'bg-stone-700 dark:bg-stone-300',
    text: 'text-stone-700 dark:text-stone-300',
    Icon: ShoppingBag,
  },
  RENT: {
    label: 'For Rent',
    color: 'bg-teal-600',
    text: 'text-teal-600 dark:text-teal-400',
    Icon: Home,
  },
  SERVICE: {
    label: 'Services',
    color: 'bg-violet-600',
    text: 'text-violet-600 dark:text-violet-400',
    Icon: Wrench,
  },
};

export const EMPTY_WEEKLY_NEW_USERS: AdminWeeklyNewUsers[] = [
  {
    day: 'Mon',
    count: 0,
  },
  {
    day: 'Tue',
    count: 0,
  },
  {
    day: 'Wed',
    count: 0,
  },
  {
    day: 'Thu',
    count: 0,
  },
  {
    day: 'Fri',
    count: 0,
  },
  {
    day: 'Sat',
    count: 0,
  },
  {
    day: 'Sun',
    count: 0,
  },
];

export const EMPTY_LISTING_TYPE_BREAKDOWN: AdminListingTypeBreakdown[] = [
  { type: 'SELL', count: 0, pct: 0 },
  { type: 'RENT', count: 0, pct: 0 },
  { type: 'SERVICE', count: 0, pct: 0 },
];
