"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useUser } from "@/utils/UserContext";
import { LogoutModal } from "@/components/auth/logout-modal";
import {
  LayoutDashboard,
  Users,
  Package,
  Handshake,
  Flag,
  ShieldCheck,
  Settings,
  UserCog,
  LogOut,
  ChevronUp,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAdminReports } from "@/services/adminReportsService";
import { getAdminVerifications } from "@/services/adminVerificationsService";
import { SafeImage } from "@/components/ui/safe-image";

const BADGE_KEYS = {
  reports: "/admin/reports",
  verifications: "/admin/verifications",
} as const;

interface NavItem {
  href: string;
  label: string;
  Icon: React.ElementType;
  roles?: Array<"ADMIN" | "SUPER_ADMIN">;
}

// ── Main navigation (sidebar links) ───────────────────────────────────────────
// Settings and Admin Management have been moved to the user dropdown below.
const NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", Icon: Users },
  { href: "/admin/listings", label: "Listings", Icon: Package },
  { href: "/admin/transactions", label: "Transactions", Icon: Handshake },
  { href: "/admin/reports", label: "Reports", Icon: Flag },
  { href: "/admin/verifications", label: "Verifications", Icon: ShieldCheck },
];

// ── User-scoped menu (shown in bottom dropdown) ───────────────────────────────
const USER_MENU: NavItem[] = [
  {
    href: "/admin/admins",
    label: "Admin Management",
    Icon: UserCog,
    roles: ["SUPER_ADMIN"],
  },
  { href: "/admin/settings", label: "Settings", Icon: Settings },
];

// ─────────────────────────────────────────────────────────────────────────────
// SidebarContent
// ─────────────────────────────────────────────────────────────────────────────
interface SidebarContentProps {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onRequestLogout?: () => void;
}

function SidebarContent({
  onNavigate,
  collapsed = false,
  onToggleCollapse,
  onRequestLogout,
}: SidebarContentProps) {
  const pathname = usePathname();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { user } = useUser();
  const [dropdownOpen, setDropdown] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({
    [BADGE_KEYS.reports]: 0,
    [BADGE_KEYS.verifications]: 0,
  });
  const effectiveTheme = resolvedTheme ?? theme;
  const isDarkMode = effectiveTheme === "dark";
  const roleFromUser = String(user?.role ?? "").toUpperCase();
  const currentAdminRole: "ADMIN" | "SUPER_ADMIN" | null =
    roleFromUser === "SUPER_ADMIN"
      ? "SUPER_ADMIN"
      : roleFromUser === "ADMIN"
        ? "ADMIN"
        : null;

  const filteredNav = NAV;
  const filteredUserMenu = USER_MENU.filter(
    (item) => !item.roles || (currentAdminRole !== null && item.roles.includes(currentAdminRole)),
  );

  useEffect(() => {
    let active = true;

    const loadPendingCounts = async () => {
      try {
        const [reports, verifications] = await Promise.all([
          getAdminReports(),
          getAdminVerifications(),
        ]);

        if (!active) return;

        const pendingReports = reports.reports.filter((item) => item.status === "PENDING").length;
        const pendingVerifications = verifications.verifications.filter((item) => item.status === "PENDING").length;

        setBadges({
          [BADGE_KEYS.reports]: pendingReports,
          [BADGE_KEYS.verifications]: pendingVerifications,
        });
      } catch {
        if (!active) return;
        setBadges((prev) => prev);
      }
    };

    void loadPendingCounts();

    return () => {
      active = false;
    };
  }, [pathname]);

  return (
    // overflow-visible so the user dropdown can render above the bottom section
    // without being clipped by the sidebar container.
    <div className="flex flex-col h-full overflow-visible">
      {/* ── Logo + collapse toggle ─────────────────────────────────────── */}
      <div
        className={cn(
          "shrink-0 border-b border-white/10",
          collapsed
            ? "flex flex-col items-center gap-2 py-3.5"
            : "flex items-center gap-2.5 px-5 py-5",
        )}
      >
        <Image
          src="/logo.png"
          alt="P2P Marketplace"
          loading="eager"
          width={32}
          height={32}
          className="shrink-0"
        />

        {/* Text — only shown when expanded */}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-none">
              P2P Marketplace
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Admin Panel</p>
          </div>
        )}

        {/* Collapse toggle button */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto py-4",
          collapsed
            ? "flex flex-col items-center gap-1 px-0"
            : "px-3 space-y-0.5",
        )}
      >
        {filteredNav.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const badge = badges[href];

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              className={cn(
                "relative flex items-center rounded-xl transition-all",
                collapsed
                  ? "justify-center w-10 h-10"
                  : "gap-3 px-3 py-2.5 w-full text-sm font-medium",
                active
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />

              {/* Label (expanded only) */}
              {!collapsed && <span className="flex-1">{label}</span>}

              {/* Badge: count when expanded, red dot when collapsed */}
              {badge ? (
                collapsed ? (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )
              ) : active && !collapsed ? (
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom: user button + dropdown ──────────────────────────────── */}
      <div
        className={cn(
          "relative shrink-0 border-t border-white/10",
          collapsed ? "p-2" : "p-4",
        )}
      >
        {/* Close dropdown on outside click */}
        {dropdownOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdown(false)}
          />
        )}

        {/* ── Dropdown menu — renders above the button ── */}
        {dropdownOpen && (
          <div
            className={cn(
              "absolute z-50 bottom-full mb-2",
              // When collapsed, align to left and set a fixed width so it
              // extends to the right of the icon-only sidebar.
              collapsed ? "left-0 min-w-52" : "left-2 right-2",
              "bg-[#252f45] border border-white/10 rounded-2xl shadow-2xl overflow-hidden",
              // Slide-up entrance
              "animate-in fade-in slide-in-from-bottom-2 duration-150",
            )}
          >
            {/* User menu items */}
            <div className="py-1.5">
              {filteredUserMenu.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => {
                    setDropdown(false);
                    onNavigate?.();
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <Icon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  {label}
                </Link>
              ))}

              <button
                type="button"
                onClick={() => setTheme(isDarkMode ? "light" : "dark")}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                {isDarkMode ? (
                  <Sun className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                )}
                {isDarkMode ? "Light Mode" : "Dark Mode"}
              </button>
            </div>

            {/* Log out */}
            <div className="border-t border-white/10 py-1.5">
              <button
                type="button"
                onClick={() => {
                  setDropdown(false);
                  onRequestLogout?.();
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                Log Out
              </button>
            </div>
          </div>
        )}

        {/* ── User trigger button ── */}
        <button
          type="button"
          onClick={() => setDropdown((v) => !v)}
          className={cn(
            "w-full flex items-center rounded-xl transition-all",
            "hover:bg-white/5 active:bg-white/10",
            collapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-2 py-2",
          )}
        >
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 ring-2 ring-white/10">
            <SafeImage
              src={user?.profileImageUrl}
              type="profile"
              alt={`${user?.firstName}'s profile picture`}
              width={32}
              height={32}
            />
          </div>

          {/* Name + email (expanded only) */}
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-bold text-white truncate leading-tight">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {user?.email}
                </p>
              </div>

              {/* Animated chevron */}
              <ChevronUp
                className={cn(
                  "w-3.5 h-3.5 shrink-0 text-slate-500 transition-transform duration-200",
                  dropdownOpen ? "rotate-0" : "rotate-180",
                )}
              />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AdminLayout
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsSmallScreen(window.innerWidth < 1024);
    };

    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  const effectiveCollapsed = isSmallScreen ? true : collapsed;

  return (
    <>
      <LogoutModal
        open={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
      />

      <div className="fixed inset-0 z-100 flex bg-stone-100 dark:bg-[#0f1117] overflow-hidden">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div
          className={cn(
            "flex flex-col shrink-0 bg-[#1e2433] h-full",
            "transition-all duration-300 ease-in-out",
            effectiveCollapsed ? "w-16" : "w-60",
          )}
        >
          <SidebarContent
            collapsed={effectiveCollapsed}
            onToggleCollapse={
              isSmallScreen ? undefined : () => setCollapsed((c) => !c)
            }
            onRequestLogout={() => setLogoutModalOpen(true)}
          />
        </div>

        {/* ── Main area ───────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </>
  );
}
