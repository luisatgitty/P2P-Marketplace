"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@/utils/UserContext";
import { useTheme } from "next-themes";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { getConversations } from "@/services/messagingService";
import { LogoutModal } from "@/components/auth/logout-modal";
import {
  Sun, Moon, MessageCircle, LogOut, User, Home,
  ChevronDown, Tag, Store, Wrench, LayoutGrid, UserPlus,
  Bell, LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/ui/safe-image";
import VerificationBadge from "@/components/verification-badge";
import { NotificationItem, type NotificationItemData } from "@/components/notifications/notification-item";

// ─── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  { label: "All",      value: "all",     icon: LayoutGrid },
  { label: "Buy",      value: "sell",    icon: Tag        },
  { label: "Rent",     value: "rent",    icon: Store      },
  { label: "Services", value: "service", icon: Wrench     },
];

const INITIAL_MOCK_NOTIFICATIONS: NotificationItemData[] = [
  {
    id: "notif-1",
    user_id: "mock-user-1",
    type: "NEW_MESSAGE",
    message: "You received a new message about your listing: Vintage Camera.",
    link: "/messages",
    is_read: false,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: "notif-2",
    user_id: "mock-user-1",
    type: "LISTING_UPDATE",
    message: "Your listing status has been changed to UNAVAILABLE.",
    link: "/profile",
    is_read: true,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "notif-3",
    user_id: "mock-user-1",
    type: "REPORT_REVIEWED",
    message: "A report you submitted has been reviewed by the moderation team.",
    link: "/notifications",
    is_read: false,
    created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  },
];

// ─── Center tabs (needs Suspense because of useSearchParams) ───────────────────
function NavTabsInner() {
  const searchParams = useSearchParams();
  const router        = useRouter();
  const pathname      = usePathname();
  const activeType    = searchParams.get("type") || "all";
  const isHomePage    = pathname === "/";

  const handleTabClick = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("type");
    } else {
      params.set("type", value);
    }
    params.delete("page");
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      {TABS.map((tab) => {
        const isActive = isHomePage && activeType === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => handleTabClick(tab.value)}
            className={cn("tab-nav-base", 
              isActive ? "tab-nav-active" : "tab-nav-inactive")}>
            <tab.icon size={14} className="shrink-0" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Fallback skeleton while tabs load
function TabsFallback() {
  return (
    <div className="flex items-center gap-1">
      {TABS.map((tab) => (
        <div key={tab.value} className="h-8 w-16 rounded-lg bg-white/5 animate-pulse" />
      ))}
    </div>
  );
}

// ─── Main Navbar ───────────────────────────────────────────────────────────────
export default function Navbar() {
  const { isAuth, user } = useUser();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const isVerifiedSeller = (user?.status ?? "").toLowerCase() === "verified";
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItemData[]>(INITIAL_MOCK_NOTIFICATIONS);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // If the user role is ADMIN or SUPER_ADMIN, show a banner at the top linking to the admin dashboard
  const isAdmin = user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN");
  const canSeeNotifications = Boolean(isAuth && user && user.role === "USER");
  const hasUnreadNotifications = notifications.some((notification) => !notification.is_read);

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, is_read: true } : notification
      )
    );
    setNotificationOpen(false);
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })));
  };

  const handleLogOut = () => {
    setLogoutModalOpen(true);
    setDropdownOpen(false);
    setNotificationOpen(false);
  }

  const refreshUnreadState = useCallback(async () => {
    if (!isAuth) {
      setHasUnreadMessages(false);
      return;
    }

    try {
      const conversations = await getConversations();
      const hasUnread = conversations.some((conversation) => (conversation.unreadCount ?? 0) > 0);
      setHasUnreadMessages(hasUnread);
    } catch {
      // Keep current state on transient errors.
    }
  }, [isAuth]);

  // Avoid hydration mismatch for theme
  useEffect(() => setMounted(true), []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }

      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    refreshUnreadState();
  }, [refreshUnreadState]);

  useEffect(() => {
    const onMessagesUpdated = () => {
      refreshUnreadState();
    };

    window.addEventListener("messages:updated", onMessagesUpdated);
    return () => window.removeEventListener("messages:updated", onMessagesUpdated);
  }, [refreshUnreadState]);

  useEffect(() => {
    if (!isAuth) return;
    if (!pathname.startsWith("/messages")) return;

    refreshUnreadState();
  }, [isAuth, pathname, refreshUnreadState]);

  return (
    <>
      <LogoutModal
        open={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
      />

      {/* Amber accent stripe */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-amber-800" />

      {/* Main navbar */}
      <nav className="fixed top-1 left-0 right-0 z-50 bg-[#1a2235]/95 backdrop-blur-xs text-white shadow-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">

          {/* ── LEFT: Branding ─────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-2 shrink-0 min-w-0">
            <Image
              src="/logo.png"
              alt="P2P Marketplace"
              width={32}
              height={32}
              className="shrink-0"
            />
            <span className="font-bold text-base sm:text-lg leading-tight hidden sm:block whitespace-nowrap tracking-tight">
              P2P Marketplace
            </span>
          </Link>

          {/* ── CENTER: Tab navigation ──────────────────────────── */}
          <Suspense fallback={<TabsFallback />}>
            <NavTabsInner />
          </Suspense>

          {/* ── RIGHT: Actions ──────────────────────────────────── */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Notification dropdown */}
            {canSeeNotifications && (
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setNotificationOpen((v) => !v)}
                  className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell size={18} className="text-stone-400" />
                  {hasUnreadNotifications && (
                    <span className="absolute right-0 bottom-0 w-2 h-2 rounded-full bg-amber-500 border border-[#1a2235]" />
                  )}
                </button>

                {notificationOpen && (
                  <div className="absolute right-0 mt-2 w-88 max-w-[90vw] rounded-xl border border-white/10 bg-[#1e2b3c] shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden">
                    <div className="px-3 py-2.5 border-b border-white/10 bg-white/5 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white">Notifications</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-stone-400">{notifications.length} items</span>
                        <button
                          type="button"
                          onClick={handleMarkAllNotificationsRead}
                          disabled={!hasUnreadNotifications}
                          className="text-[11px] font-medium text-amber-300 hover:text-amber-200 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors"
                        >
                          Mark all as read
                        </button>
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto p-2 space-y-1.5">
                      {notifications.length === 0 ? (
                        <div className="px-2 py-8 text-center text-sm text-stone-400">No notifications yet.</div>
                      ) : (
                        notifications.map((notification) => (
                          <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onClick={handleMarkNotificationRead}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Account menu"
              >
                <div className="relative w-7 h-7">
                  <div className="w-7 h-7 rounded-full bg-stone-600 overflow-hidden border border-white/20">
                  <SafeImage
                    src={user?.profileImageUrl}
                    type="profile"
                    alt={`${user?.firstName}'s profile picture`}
                    width={28}
                    height={28}
                  />
                  </div>
                  {isAuth && hasUnreadMessages && (
                    <span className="absolute bottom-0 right-0 z-10 w-3 h-3 rounded-full bg-amber-500 border border-[#1a2235]" />
                  )}
                </div>
                <ChevronDown
                  size={13}
                  className={cn("text-stone-400 transition-transform duration-200", dropdownOpen && "rotate-180")}
                />
              </button>

              {/* Dropdown panel */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#1e2b3c] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {isAuth ? (
                    <>
                      {/* User info */}
                      <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                        <p className="text-sm font-semibold text-white leading-tight flex items-center gap-1.5">
                          {user?.firstName} {user?.lastName}
                          {<VerificationBadge verified={isVerifiedSeller} />}
                        </p>
                        <p className="text-xs text-stone-400 truncate mt-0.5">{user?.email}</p>
                      </div>

                      <div className="py-1">
                        {isAdmin ? (
                          <>
                            <Link
                              href="/admin"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <LayoutDashboard size={15} className="text-stone-400" />
                              Admin Dashboard
                            </Link>
                            {mounted && (
                              <button
                                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors"
                              >
                                {theme === "dark"
                                  ? <Sun size={15} className="text-amber-400" />
                                  : <Moon size={15} className="text-stone-300" />
                                }
                                {theme === "dark" ? "Light Mode" : "Dark Mode"}
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <Link
                              href="/"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <Home size={15} className="text-stone-400" />
                              Home
                            </Link>
                            <Link
                              href="/profile"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <User size={15} className="text-stone-400" />
                              Profile
                            </Link>
                            <Link
                              href="/messages"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <span className="relative inline-flex">
                                <MessageCircle size={15} className="text-stone-400" />
                                {hasUnreadMessages && (
                                  <span className="absolute -right-1 -bottom-1 w-2 h-2 rounded-full bg-amber-500 border border-[#1e2b3c]" />
                                )}
                              </span>
                              Messages
                            </Link>
                            <Link
                              href="/notifications"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <Bell size={15} className="text-stone-400" />
                              Notifications
                            </Link>
                            {isVerifiedSeller ? (
                              <Link
                                href="/create"
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors"
                              >
                                <Tag size={15} className="text-stone-400" />
                                Post a Listing
                              </Link>
                            ) : (
                              <Link
                                href="/become-seller"
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 transition-colors"
                              >
                                <UserPlus size={15} />
                                Become a Seller
                              </Link>
                            )}
                            {mounted && (
                              <button
                                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors"
                              >
                                {theme === "dark"
                                  ? <Sun size={15} className="text-amber-400" />
                                  : <Moon size={15} className="text-stone-300" />
                                }
                                {theme === "dark" ? "Light Mode" : "Dark Mode"}
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      <div className="border-t border-white/10" />
                      <button
                        onClick={handleLogOut}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                      >
                        <LogOut size={15} />
                        Log Out
                      </button>
                    </>
                  ) : (
                    <div className="py-1">
                      <Link
                        href="/"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        <Home size={15} className="text-stone-400" />
                        Home
                      </Link>
                      <Link
                        href="/login"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                      >
                        <User size={15} className="text-stone-400" />
                        Log In
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 transition-colors"
                      >
                        <UserPlus size={15} />
                        Create Account
                      </Link>
                      {mounted && (
                        <button
                          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-stone-200 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          {theme === "dark"
                            ? <Sun size={15} className="text-amber-400" />
                            : <Moon size={15} className="text-stone-300" />
                          }
                          {theme === "dark" ? "Light Mode" : "Dark Mode"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer for fixed navbar (1px stripe + 56px nav) */}
      <div className="h-15" />
    </>
  );
}
