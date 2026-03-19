"use client";

import Link from "next/link";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Placeholder data ───────────────────────────────────────────────────────────
const STATS = [
  {
    label: "Total Users",
    value: "1,247",
    sub: "+89 this week",
    trend: "up",
    Icon: Users,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    href: "/admin/users",
  },
  {
    label: "Active Listings",
    value: "3,891",
    sub: "+127 this week",
    trend: "up",
    Icon: Package,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/30",
    href: "/admin/listings",
  },
  {
    label: "Pending Reports",
    value: "23",
    sub: "8 flagged today",
    trend: "up",
    Icon: Flag,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    href: "/admin/reports",
  },
  {
    label: "Pending Verifications",
    value: "12",
    sub: "3 submitted today",
    trend: "neutral",
    Icon: ShieldCheck,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    href: "/admin/verifications",
  },
];

const LISTING_TYPES = [
  {
    label: "For Sale",
    count: 2341,
    pct: 60.2,
    color: "bg-stone-700 dark:bg-stone-300",
    text: "text-stone-700 dark:text-stone-300",
    Icon: ShoppingBag,
  },
  {
    label: "For Rent",
    count: 891,
    pct: 22.9,
    color: "bg-teal-600",
    text: "text-teal-600 dark:text-teal-400",
    Icon: Home,
  },
  {
    label: "Services",
    count: 659,
    pct: 16.9,
    color: "bg-violet-600",
    text: "text-violet-600 dark:text-violet-400",
    Icon: Wrench,
  },
];

const USER_ROLES = [
  { label: "Regular Users", count: 1229, pct: 98.5, color: "bg-blue-500" },
  { label: "Admins", count: 17, pct: 1.4, color: "bg-violet-500" },
  { label: "Super Admins", count: 1, pct: 0.1, color: "bg-amber-500" },
];

const WEEKLY_NEW_USERS = [
  { day: "Mon", count: 42 },
  { day: "Tue", count: 38 },
  { day: "Wed", count: 67 },
  { day: "Thu", count: 51 },
  { day: "Fri", count: 89 },
  { day: "Sat", count: 73 },
  { day: "Sun", count: 47 },
];
const MAX_WEEKLY = Math.max(...WEEKLY_NEW_USERS.map((d) => d.count));

const RECENT_USERS = [
  {
    id: "1",
    name: "Juan Miguel Dela Cruz",
    email: "juan@email.com",
    role: "USER",
    verification: "VERIFIED",
    joined: "Mar 19, 2026",
  },
  {
    id: "2",
    name: "Maria Cristina Santos",
    email: "maria@email.com",
    role: "USER",
    verification: "PENDING",
    joined: "Mar 19, 2026",
  },
  {
    id: "3",
    name: "Pedro Jose Reyes",
    email: "pedro@email.com",
    role: "USER",
    verification: "VERIFIED",
    joined: "Mar 18, 2026",
  },
  {
    id: "4",
    name: "Ana Liza Bautista",
    email: "ana@email.com",
    role: "USER",
    verification: "UNVERIFIED",
    joined: "Mar 18, 2026",
  },
  {
    id: "5",
    name: "Carlos Rafael Mendoza",
    email: "carlos@email.com",
    role: "USER",
    verification: "VERIFIED",
    joined: "Mar 17, 2026",
  },
];

const RECENT_REPORTS = [
  {
    id: "1",
    reporter: "Juan dela Cruz",
    target: "Scam listing — iPhone 16",
    reason: "Scam / Fraud",
    status: "PENDING",
    ago: "2h ago",
  },
  {
    id: "2",
    reporter: "Maria Santos",
    target: "User: fake_seller_99",
    reason: "Fake Account",
    status: "PENDING",
    ago: "5h ago",
  },
  {
    id: "3",
    reporter: "Pedro Reyes",
    target: "Honda Beat — wrong description",
    reason: "Misleading Info",
    status: "PENDING",
    ago: "8h ago",
  },
  {
    id: "4",
    reporter: "Ana Bautista",
    target: "Studio Unit — Makati",
    reason: "Prohibited Item",
    status: "RESOLVED",
    ago: "1d ago",
  },
  {
    id: "5",
    reporter: "Carlos Mendoza",
    target: "Aircon Cleaning",
    reason: "Spam / Duplicate",
    status: "DISMISSED",
    ago: "2d ago",
  },
];

// ── Shared badge components ────────────────────────────────────────────────────
function VerifBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    VERIFIED:
      "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
    PENDING:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    UNVERIFIED:
      "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400",
    REJECTED: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
  };
  return (
    <span
      className={cn(
        "text-[10px] font-bold px-2 py-0.5 rounded-full",
        map[status] ?? map.UNVERIFIED,
      )}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function ReportBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    RESOLVED:
      "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
    DISMISSED:
      "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400",
  };
  return (
    <span
      className={cn(
        "text-[10px] font-bold px-2 py-0.5 rounded-full",
        map[status] ?? map.PENDING,
      )}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default function DashboardPage() {
  return (
    <div className="p-5 sm:p-6 space-y-6">
      {/* ── Page header ── */}
      <div>
        <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-50">
          Dashboard
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          Overview of your P2P Marketplace — last updated just now.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map(({ label, value, sub, trend, Icon, color, bg, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  bg,
                )}
              >
                <Icon className={cn("w-5 h-5", color)} />
              </div>
              {trend === "up" && (
                <TrendingUp className="w-4 h-4 text-teal-500" />
              )}
              {trend === "down" && (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              {trend === "neutral" && (
                <Activity className="w-4 h-4 text-stone-400 dark:text-stone-500" />
              )}
            </div>
            <p className="text-2xl font-extrabold text-stone-900 dark:text-stone-50 leading-none">
              {value}
            </p>
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mt-1">
              {label}
            </p>
            <p
              className={cn(
                "text-[11px] font-semibold mt-1.5 flex items-center gap-1",
                trend === "up"
                  ? "text-teal-600 dark:text-teal-400"
                  : trend === "down"
                    ? "text-red-500"
                    : "text-stone-400 dark:text-stone-500",
              )}
            >
              {trend !== "neutral" && (
                <ArrowUpRight
                  className={cn("w-3 h-3", trend === "down" && "rotate-90")}
                />
              )}
              {sub}
            </p>
          </Link>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* New users this week */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-bold text-stone-900 dark:text-stone-50">
                New Users — This Week
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                407 total registrations
              </p>
            </div>
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 px-2.5 py-1 rounded-full">
              ↑ 18.4%
            </span>
          </div>
          <div className="flex items-end gap-2 h-32">
            {WEEKLY_NEW_USERS.map(({ day, count }) => (
              <div
                key={day}
                className="flex-1 flex flex-col items-center gap-1.5"
              >
                <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400">
                  {count}
                </span>
                <div
                  className="w-full rounded-t-md bg-[#1e2433] dark:bg-stone-300 transition-all duration-300"
                  style={{
                    height: `${(count / MAX_WEEKLY) * 100}%`,
                    minHeight: 6,
                  }}
                />
                <span className="text-[10px] text-stone-400 dark:text-stone-500">
                  {day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Listing type breakdown */}
        <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] p-5">
          <p className="text-sm font-bold text-stone-900 dark:text-stone-50 mb-1">
            Listings by Type
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-5">
            3,891 total active
          </p>
          <div className="space-y-4">
            {LISTING_TYPES.map(({ label, count, pct, color, text, Icon }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-3.5 h-3.5", text)} />
                    <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                      {label}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                    {count.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-stone-100 dark:bg-[#13151f] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      color,
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5 text-right">
                  {pct}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Second row: user roles + quick summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User roles */}
        <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] p-5">
          <p className="text-sm font-bold text-stone-900 dark:text-stone-50 mb-1">
            Users by Role
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-5">
            1,247 total accounts
          </p>
          <div className="space-y-4">
            {USER_ROLES.map(({ label, count, pct, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                    {label}
                  </span>
                  <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                    {count.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-stone-100 dark:bg-[#13151f] rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", color)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Quick health metrics */}
          <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-stone-100 dark:border-[#2a2d3e]">
            {[
              {
                Icon: UserCheck,
                label: "Active",
                value: "94.2%",
                color: "text-teal-500",
              },
              {
                Icon: UserX,
                label: "Inactive",
                value: "5.8%",
                color: "text-red-400",
              },
              {
                Icon: CheckCircle2,
                label: "Email verified",
                value: "88.3%",
                color: "text-blue-500",
              },
              {
                Icon: AlertTriangle,
                label: "Locked",
                value: "0.4%",
                color: "text-amber-500",
              },
            ].map(({ Icon, label, value, color }) => (
              <div
                key={label}
                className="bg-stone-50 dark:bg-[#13151f] rounded-xl p-2.5 text-center"
              >
                <Icon className={cn("w-4 h-4 mx-auto mb-1", color)} />
                <p className="text-xs font-bold text-stone-800 dark:text-stone-100">
                  {value}
                </p>
                <p className="text-[10px] text-stone-400 dark:text-stone-500">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent users */}
        <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-stone-900 dark:text-stone-50">
              Recent Users
            </p>
            <Link
              href="/admin/users"
              className="text-[11px] font-semibold text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {RECENT_USERS.map(({ id, name, email, verification, joined }) => (
              <div key={id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3a4a6a] to-[#1e2a40] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  {name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-stone-800 dark:text-stone-100 truncate">
                    {name}
                  </p>
                  <p className="text-[10px] text-stone-400 dark:text-stone-500 truncate">
                    {email}
                  </p>
                </div>
                <VerifBadge status={verification} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent reports */}
        <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-stone-900 dark:text-stone-50">
              Recent Reports
            </p>
            <Link
              href="/admin/reports"
              className="text-[11px] font-semibold text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {RECENT_REPORTS.map(
              ({ id, reporter, target, reason, status, ago }) => (
                <div key={id} className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Flag className="w-3 h-3 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-stone-800 dark:text-stone-100 truncate">
                      {reason}
                    </p>
                    <p className="text-[10px] text-stone-400 dark:text-stone-500 truncate">
                      {target}
                    </p>
                    <p className="text-[10px] text-stone-400 dark:text-stone-500">
                      {reporter} · {ago}
                    </p>
                  </div>
                  <ReportBadge status={status} />
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
