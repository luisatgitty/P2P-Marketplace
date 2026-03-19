"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/utils/UserContext";
import {
  LayoutDashboard,
  Users,
  Package,
  Flag,
  ShieldCheck,
  Settings,
  UserCog,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Replace with real auth context once wired ──────────────────────────────────
const SESSION = {
  name: "Super Admin",
  email: "superadmin@p2pmarket.ph",
  role: "SUPER_ADMIN" as "USER" | "ADMIN" | "SUPER_ADMIN",
  avatar: "SA",
};

// ── Badge counts — wire to real API later ──────────────────────────────────────
const BADGES: Record<string, number> = {
  "/admin/reports": 23,
  "/admin/verifications": 12,
};

interface NavItem {
  href: string;
  label: string;
  Icon: React.ElementType;
  roles?: Array<"ADMIN" | "SUPER_ADMIN">;
}

const NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", Icon: Users },
  { href: "/admin/listings", label: "Listings", Icon: Package },
  { href: "/admin/reports", label: "Reports", Icon: Flag },
  { href: "/admin/verifications", label: "Verifications", Icon: ShieldCheck },
  { href: "/admin/settings", label: "Settings", Icon: Settings },
  {
    href: "/admin/admins",
    label: "Admin Management",
    Icon: UserCog,
    roles: ["SUPER_ADMIN"],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { clearUserData } = useUser();
  const filtered = NAV.filter(
    (item) => !item.roles || item.roles.includes(SESSION.role as any),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-black text-white">P2P</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-none">
              P2P Marketplace
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] px-2 mb-2">
          Menu
        </p>
        {filtered.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const badge = BADGES[href];
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {badge ? (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {badge > 9 ? "9+" : badge}
                </span>
              ) : active ? (
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user info + logout */}
      <div className="flex-shrink-0 border-t border-white/10 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
            {SESSION.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">
              {SESSION.name}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {SESSION.email}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-red-400 transition-colors"
          onClick={clearUserData}
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Current page title from nav
  const currentNav = NAV.find(
    (n) => pathname === n.href || pathname.startsWith(n.href + "/"),
  );

  return (
    // Fixed full-screen overlay — sits above the root layout's Navbar/Footer
    <div className="fixed inset-0 z-[100] flex bg-stone-100 dark:bg-[#0f1117] overflow-hidden">
      {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-[#1e2433] h-full">
        <SidebarContent />
      </div>

      {/* ── Mobile sidebar overlay ───────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-[#1e2433] flex flex-col",
          "transition-transform duration-300 ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </div>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 h-14 bg-white dark:bg-[#1c1f2e] border-b border-stone-200 dark:border-[#2a2d3e] flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-[#252837] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-bold text-stone-900 dark:text-stone-50">
              {currentNav?.label ?? "Admin Panel"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button
              type="button"
              className="relative w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 dark:text-stone-500 hover:bg-stone-100 dark:hover:bg-[#252837] transition-colors"
            >
              <Bell className="w-4.5 h-4.5 w-[18px] h-[18px]" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            </button>
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white text-[10px] font-bold">
              {SESSION.avatar}
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
