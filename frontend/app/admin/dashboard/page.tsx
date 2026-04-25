'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Package,
  Flag,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Activity,
  ShoppingBag,
  Home,
  Wrench,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getAdminDashboardStats,
  type AdminDashboardStats,
  type AdminListingTypeBreakdown,
  type AdminWeeklyNewUsers,
} from '@/services/adminService';

// ── Placeholder data ───────────────────────────────────────────────────────────
type Trend = 'up' | 'down' | 'neutral';

const STAT_CARD_META = [
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

const EMPTY_STATS: AdminDashboardStats = {
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

function getTrend(current: number, previous: number): Trend {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'neutral';
}

const LISTING_TYPE_META: Record<
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

const EMPTY_WEEKLY_NEW_USERS: AdminWeeklyNewUsers[] = [
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

const EMPTY_LISTING_TYPE_BREAKDOWN: AdminListingTypeBreakdown[] = [
  { type: 'SELL', count: 0, pct: 0 },
  { type: 'RENT', count: 0, pct: 0 },
  { type: 'SERVICE', count: 0, pct: 0 },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats>(EMPTY_STATS);
  const [weeklyNewUsers, setWeeklyNewUsers] = useState<AdminWeeklyNewUsers[]>(
    EMPTY_WEEKLY_NEW_USERS,
  );
  const [weeklyNewListings, setWeeklyNewListings] = useState<
    AdminWeeklyNewUsers[]
  >(EMPTY_WEEKLY_NEW_USERS);
  const [listingTypeBreakdown, setListingTypeBreakdown] = useState<
    AdminListingTypeBreakdown[]
  >(EMPTY_LISTING_TYPE_BREAKDOWN);
  const [listingTypeTotalActive, setListingTypeTotalActive] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      try {
        const data = await getAdminDashboardStats();
        if (!mounted) return;
        setStats({ ...EMPTY_STATS, ...data.stats });
        setWeeklyNewUsers(
          data.weeklyNewUsers.length > 0
            ? data.weeklyNewUsers
            : EMPTY_WEEKLY_NEW_USERS,
        );
        setWeeklyNewListings(
          data.weeklyNewListings.length > 0
            ? data.weeklyNewListings
            : EMPTY_WEEKLY_NEW_USERS,
        );
        setListingTypeBreakdown(
          data.listingTypeBreakdown.length > 0
            ? data.listingTypeBreakdown
            : EMPTY_LISTING_TYPE_BREAKDOWN,
        );
        setListingTypeTotalActive(data.listingTypeTotalActive);
      } catch (err) {
        if (!mounted) return;
        const message =
          typeof err === 'string' ? err : 'Failed to load dashboard stats';
        toast.error(message, { position: 'top-center' });
      }
    };

    void loadStats();

    return () => {
      mounted = false;
    };
  }, []);

  const statCards = useMemo(() => {
    const usersTrend = getTrend(stats.newUsersThisWeek, stats.newUsersLastWeek);
    const listingsTrend = getTrend(
      stats.newListingsThisWeek,
      stats.newListingsLastWeek,
    );
    const reportsTrend = getTrend(
      stats.pendingReportsToday,
      stats.pendingReportsYesterday,
    );
    const verificationsTrend = getTrend(
      stats.pendingVerificationsToday,
      stats.pendingVerificationsYesterday,
    );

    const dynamic = {
      totalUsers: {
        value: stats.totalUsers.toLocaleString(),
        sub: `${stats.newUsersThisWeek.toLocaleString()} this week`,
        trend: usersTrend,
      },
      activeListings: {
        value: stats.activeListings.toLocaleString(),
        sub: `${stats.newListingsThisWeek.toLocaleString()} this week`,
        trend: listingsTrend,
      },
      pendingReports: {
        value: stats.pendingReports.toLocaleString(),
        sub: `${stats.pendingReportsToday.toLocaleString()} flagged today`,
        trend: reportsTrend,
      },
      pendingVerifications: {
        value: stats.pendingVerifications.toLocaleString(),
        sub: `${stats.pendingVerificationsToday.toLocaleString()} submitted today`,
        trend: verificationsTrend,
      },
    } as const;

    return STAT_CARD_META.map((card) => ({
      ...card,
      ...dynamic[card.key],
    }));
  }, [stats]);

  const maxWeekly = Math.max(1, ...weeklyNewUsers.map((d) => d.count));
  const totalWeeklyRegistrations = weeklyNewUsers.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const weeklyTrend = getTrend(stats.newUsersThisWeek, stats.newUsersLastWeek);
  const weeklyChangePct =
    stats.newUsersLastWeek <= 0
      ? stats.newUsersThisWeek > 0
        ? 100
        : 0
      : ((stats.newUsersThisWeek - stats.newUsersLastWeek) /
          stats.newUsersLastWeek) *
        100;
  const maxWeeklyListings = Math.max(
    1,
    ...weeklyNewListings.map((d) => d.count),
  );
  const totalWeeklyListings = weeklyNewListings.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const weeklyListingsTrend = getTrend(
    stats.newListingsThisWeek,
    stats.newListingsLastWeek,
  );
  const weeklyListingsChangePct =
    stats.newListingsLastWeek <= 0
      ? stats.newListingsThisWeek > 0
        ? 100
        : 0
      : ((stats.newListingsThisWeek - stats.newListingsLastWeek) /
          stats.newListingsLastWeek) *
        100;
  const listingTypeRows = listingTypeBreakdown.map((item) => ({
    ...item,
    ...LISTING_TYPE_META[item.type],
  }));
  const totalUsersBase = Math.max(1, stats.totalUsers);
  const userHealthCards = [
    {
      Icon: UserCheck,
      label: 'Active',
      value: `${((stats.activeUsers / totalUsersBase) * 100).toFixed(1)}%`,
      color: 'text-teal-500',
    },
    {
      Icon: UserX,
      label: 'Inactive',
      value: `${((stats.inactiveUsers / totalUsersBase) * 100).toFixed(1)}%`,
      color: 'text-red-400',
    },
    {
      Icon: CheckCircle2,
      label: 'Verified',
      value: `${((stats.verifiedUsers / totalUsersBase) * 100).toFixed(1)}%`,
      color: 'text-blue-500',
    },
    {
      Icon: AlertTriangle,
      label: 'Locked',
      value: `${((stats.lockedUsers / totalUsersBase) * 100).toFixed(1)}%`,
      color: 'text-amber-500',
    },
  ];

  return (
    <div className='p-5 sm:p-6 space-y-4'>
      {/* ── Page header ── */}
      <div>
        <h2 className='text-xl font-extrabold text-stone-900 dark:text-stone-50'>
          Dashboard
        </h2>
        <p className='text-sm text-stone-500 dark:text-stone-400'>
          Overview of key metrics and recent activity
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-1'>
        {statCards.map(
          ({ label, value, sub, trend, Icon, color, bg, href }) => (
            <Link
              key={label}
              href={href}
              className='bg-white dark:bg-[#1c1f2e] rounded-lg border border-stone-200 dark:border-[#2a2d3e] p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group'
            >
              <div className='flex items-start justify-between mb-3'>
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    bg,
                  )}
                >
                  <Icon className={cn('w-5 h-5', color)} />
                </div>
                {trend === 'up' && (
                  <TrendingUp className='w-4 h-4 text-teal-500' />
                )}
                {trend === 'down' && (
                  <TrendingDown className='w-4 h-4 text-red-500' />
                )}
                {trend === 'neutral' && (
                  <Activity className='w-4 h-4 text-stone-400 dark:text-stone-500' />
                )}
              </div>
              <p className='text-2xl font-extrabold text-stone-900 dark:text-stone-50 leading-none'>
                {value}
              </p>
              <p className='text-sm font-medium text-stone-500 dark:text-stone-400 mt-1'>
                {label}
              </p>
              <p
                className={cn(
                  'text-xs font-semibold mt-1.5 flex items-center gap-1',
                  trend === 'up'
                    ? 'text-teal-600 dark:text-teal-400'
                    : trend === 'down'
                      ? 'text-red-500'
                      : 'text-stone-400 dark:text-stone-500',
                )}
              >
                {trend !== 'neutral' && (
                  <ArrowUpRight
                    className={cn('w-3 h-3', trend === 'down' && 'rotate-90')}
                  />
                )}
                {sub}
              </p>
            </Link>
          ),
        )}
      </div>

      {/* ── Charts row ── */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* New users this week */}
        <div className='lg:col-span-2 bg-white dark:bg-[#1c1f2e] rounded-lg border border-stone-200 dark:border-[#2a2d3e] p-4'>
          <div className='flex items-center justify-between mb-5'>
            <div>
              <p className='text-md font-bold text-stone-900 dark:text-stone-50'>
                New Users This Week
              </p>
              <p className='text-sm text-stone-400 dark:text-stone-500 mt-0.5'>
                {totalWeeklyRegistrations.toLocaleString()} total registrations
              </p>
            </div>
            <span
              className={cn(
                'text-sm font-bold px-2.5 py-1 rounded-lg',
                weeklyTrend === 'up' &&
                  'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30',
                weeklyTrend === 'down' &&
                  'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30',
                weeklyTrend === 'neutral' &&
                  'text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800/60',
              )}
            >
              {weeklyTrend === 'up' ? '↑' : weeklyTrend === 'down' ? '↓' : '→'}{' '}
              {Math.abs(weeklyChangePct).toFixed(1)}%
            </span>
          </div>
          <div className='flex items-end gap-2 h-32'>
            {weeklyNewUsers.map(({ day, count }) => (
              <div
                key={day}
                className='flex-1 flex flex-col items-center gap-1.5'
              >
                <span className='text-sm font-bold text-stone-500 dark:text-stone-400'>
                  {count}
                </span>
                <div
                  className='w-full rounded-t-lg bg-[#1e2433] dark:bg-stone-300 transition-all duration-300'
                  style={{
                    height: `${(count / maxWeekly) * 100}%`,
                    minHeight: 6,
                  }}
                />
                <span className='text-sm text-stone-400 dark:text-stone-500'>
                  {day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* User health */}
        <div className='bg-white dark:bg-[#1c1f2e] rounded-lg border border-stone-200 dark:border-[#2a2d3e] p-4'>
          <p className='text-md font-bold text-stone-900 dark:text-stone-50 mb-4'>
            User Health Breakdown
          </p>
          <div className='grid grid-cols-2 gap-4 bg-white dark:bg-[#1c1f2e] rounded-lg'>
            {userHealthCards.map(({ Icon, label, value, color }) => (
              <div
                key={label}
                className='bg-stone-50 dark:bg-[#13151f] rounded-lg p-2.5 text-center flex flex-col items-center justify-center'
              >
                <Icon className={cn('w-4 h-4 mx-auto mb-1', color)} />
                <p className='text-sm font-bold text-stone-800 dark:text-stone-100'>
                  {value}
                </p>
                <p className='text-xs text-stone-400 dark:text-stone-500'>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Second row ── */}
        {/* New listings created this week */}
        <div className='lg:col-span-2 bg-white dark:bg-[#1c1f2e] rounded-lg border border-stone-200 dark:border-[#2a2d3e] p-4'>
          <div className='flex items-center justify-between mb-5'>
            <div>
              <p className='text-md font-bold text-stone-900 dark:text-stone-50'>
                New Listings This Week
              </p>
              <p className='text-sm text-stone-400 dark:text-stone-500 mt-0.5'>
                {totalWeeklyListings.toLocaleString()} total listings
              </p>
            </div>
            <span
              className={cn(
                'text-sm font-bold px-2.5 py-1 rounded-lg',
                weeklyListingsTrend === 'up' &&
                  'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30',
                weeklyListingsTrend === 'down' &&
                  'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30',
                weeklyListingsTrend === 'neutral' &&
                  'text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800/60',
              )}
            >
              {weeklyListingsTrend === 'up'
                ? '↑'
                : weeklyListingsTrend === 'down'
                  ? '↓'
                  : '→'}{' '}
              {Math.abs(weeklyListingsChangePct).toFixed(1)}%
            </span>
          </div>
          <div className='flex items-end gap-2 h-32'>
            {weeklyNewListings.map(({ day, count }) => (
              <div
                key={day}
                className='flex-1 flex flex-col items-center gap-1.5'
              >
                <span className='text-sm font-bold text-stone-500 dark:text-stone-400'>
                  {count}
                </span>
                <div
                  className='w-full rounded-t-lg bg-[#1e2433] dark:bg-stone-300 transition-all duration-300'
                  style={{
                    height: `${(count / maxWeeklyListings) * 100}%`,
                    minHeight: 6,
                  }}
                />
                <span className='text-sm text-stone-400 dark:text-stone-500'>
                  {day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Listing type breakdown */}
        <div className='bg-white dark:bg-[#1c1f2e] rounded-lg border border-stone-200 dark:border-[#2a2d3e] p-4'>
          <p className='text-md font-bold text-stone-900 dark:text-stone-50 mb-4'>
            Listings by Type
          </p>
          <div className='space-y-4'>
            {listingTypeRows.map(
              ({ type, label, count, pct, color, text, Icon }) => (
                <div key={label}>
                  <div className='flex items-center justify-between mb-1.5'>
                    <div className='flex items-center gap-2'>
                      <Icon className={cn('w-3.5 h-3.5', text)} />
                      <span className='text-sm font-semibold text-stone-700 dark:text-stone-200'>
                        {label}
                      </span>
                    </div>
                    <span className='text-sm font-bold text-stone-500 dark:text-stone-400'>
                      {count.toLocaleString()}
                    </span>
                  </div>
                  <div className='h-2 bg-stone-100 dark:bg-[#13151f] rounded-full overflow-hidden'>
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        color,
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className='text-xs text-stone-400 dark:text-stone-500 mt-0.5 text-right'>
                    {pct.toFixed(1)}%
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
