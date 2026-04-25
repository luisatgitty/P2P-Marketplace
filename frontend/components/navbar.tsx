'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Suspense,
  useState,
  useRef,
  useEffect,
  useCallback,
  type MouseEvent,
} from 'react';
import { useUser } from '@/utils/UserContext';
import { useUnsavedChanges } from '@/utils/UnsavedChangesContext';
import { useConfirmDialog } from '@/utils/ConfirmDialogContext';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { getConversations } from '@/services/messagingService';
import {
  getNotificationsPage,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notificationService';
import { toast } from 'sonner';
import { LogoutModal } from '@/components/auth/logout-modal';
import {
  MessageCircle,
  LogOut,
  User,
  Home,
  ChevronDown,
  Tag,
  Store,
  Wrench,
  LayoutGrid,
  UserPlus,
  Bell,
  LayoutDashboard,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SafeImage } from '@/components/ui/safe-image';
import VerificationBadge from '@/components/verification-badge';
import {
  NotificationItem,
  type NotificationItemData,
} from '@/components/notifications/notification-item';
import { ThemeModeSwitch } from '@/components/theme-mode-switch';

// ─── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  { label: 'All', value: 'all', icon: LayoutGrid },
  { label: 'Buy', value: 'sell', icon: Tag },
  { label: 'Rent', value: 'rent', icon: Store },
  { label: 'Services', value: 'service', icon: Wrench },
];

// ─── Center tabs (needs Suspense because of useSearchParams) ───────────────────
type NavTabsInnerProps = {
  vertical?: boolean;
  onNavigate?: () => void;
};

function NavTabsInner({ vertical = false, onNavigate }: NavTabsInnerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { hasUnsavedChanges, setHasUnsavedChanges } = useUnsavedChanges();
  const { openDialog } = useConfirmDialog();
  const activeType = searchParams.get('type') || 'all';
  const isHomePage = pathname === '/';
  const shouldConfirmNavigation =
    hasUnsavedChanges || pathname === '/become-seller';

  const navigateWithConfirm = useCallback(
    (href: string) => {
      if (!shouldConfirmNavigation) {
        router.push(href);
        return;
      }

      openDialog({
        title: 'Discard Changes?',
        message:
          'Are you sure you want to discard your changes? This action cannot be undone.',
        confirmText: 'Discard',
        cancelText: 'Cancel',
        isDangerous: true,
        onConfirm: () => {
          setHasUnsavedChanges(false);
          router.push(href);
        },
        onCancel: () => {},
      });
    },
    [openDialog, router, setHasUnsavedChanges, shouldConfirmNavigation],
  );

  const handleTabClick = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('type');
    } else {
      params.set('type', value);
    }
    params.delete('page');
    const query = params.toString();
    onNavigate?.();
    navigateWithConfirm(query ? `/?${query}` : '/');
  };

  return (
    <div
      className={cn(
        vertical ? 'flex flex-col gap-1' : 'flex items-center gap-0.5 sm:gap-1',
      )}
    >
      {TABS.map((tab) => {
        const isActive = isHomePage && activeType === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => handleTabClick(tab.value)}
            className={cn(
              'tab-nav-base',
              vertical && 'w-full justify-start rounded-xl px-3 py-2.5 text-sm',
              isActive ? 'tab-nav-active' : 'tab-nav-inactive',
            )}
          >
            <tab.icon size={14} className='shrink-0' />
            <span className={cn(vertical ? 'inline' : 'hidden sm:inline')}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Fallback skeleton while tabs load
function TabsFallback() {
  return (
    <div className='flex items-center gap-1'>
      {TABS.map((tab) => (
        <div
          key={tab.value}
          className='h-8 w-16 rounded-lg bg-white/5 animate-pulse'
        />
      ))}
    </div>
  );
}

function MobileTabsFallback() {
  return (
    <div className='flex flex-col gap-2'>
      {TABS.map((tab) => (
        <div
          key={tab.value}
          className='h-10 rounded-xl bg-white/5 animate-pulse'
        />
      ))}
    </div>
  );
}

// ─── Main Navbar ───────────────────────────────────────────────────────────────
export default function Navbar() {
  const NOTIFICATIONS_PAGE_SIZE = 15;
  const { isAuth, user } = useUser();
  const { hasUnsavedChanges, setHasUnsavedChanges } = useUnsavedChanges();
  const { openDialog } = useConfirmDialog();
  const pathname = usePathname();
  const router = useRouter();
  const shouldConfirmNavigation =
    hasUnsavedChanges || pathname === '/become-seller';
  const isVerifiedSeller = (user?.status ?? '').toLowerCase() === 'verified';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownClosing, setDropdownClosing] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItemData[]>(
    [],
  );
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [notificationsTotal, setNotificationsTotal] = useState(0);
  const [notificationsHasMore, setNotificationsHasMore] = useState(false);
  const [loadingMoreNotifications, setLoadingMoreNotifications] =
    useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileSidebarPanelRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const mobileNotificationPanelRef = useRef<HTMLDivElement>(null);
  const desktopNotificationsListRef = useRef<HTMLDivElement>(null);
  const mobileNotificationsListRef = useRef<HTMLDivElement>(null);
  const dropdownCloseTimerRef = useRef<number | null>(null);

  // If the user role is ADMIN or SUPER_ADMIN, show a banner at the top linking to the admin dashboard
  const isAdmin =
    user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');
  const canSeeNotifications = Boolean(isAuth && user && user.role === 'USER');
  const hasUnreadNotifications = unreadNotificationsCount > 0;

  const mapNotificationRows = useCallback(
    (
      rows: Array<{
        id: string;
        userId: string;
        type: string;
        message: string;
        link: string;
        isRead: boolean;
        createdAt: string;
      }>,
    ): NotificationItemData[] => {
      return rows.map((row) => ({
        id: row.id,
        user_id: row.userId,
        type: row.type,
        message: row.message,
        link: row.link,
        is_read: row.isRead,
        created_at: row.createdAt,
      }));
    },
    [],
  );

  const refreshNotifications = useCallback(async () => {
    if (!isAuth) {
      setNotifications([]);
      setUnreadNotificationsCount(0);
      setNotificationsTotal(0);
      setNotificationsHasMore(false);
      return;
    }

    try {
      const page = await getNotificationsPage({
        limit: NOTIFICATIONS_PAGE_SIZE,
        offset: 0,
      });

      setNotifications(mapNotificationRows(page.notifications));
      setUnreadNotificationsCount(page.unreadCount);
      setNotificationsTotal(page.total);
      setNotificationsHasMore(
        page.offset + page.notifications.length < page.total,
      );
    } catch {
      // Keep existing notification state on transient errors.
    }
  }, [isAuth, mapNotificationRows, NOTIFICATIONS_PAGE_SIZE]);

  const loadMoreNotifications = useCallback(async () => {
    if (
      !canSeeNotifications ||
      loadingMoreNotifications ||
      !notificationsHasMore
    ) {
      return;
    }

    setLoadingMoreNotifications(true);
    try {
      const page = await getNotificationsPage({
        limit: NOTIFICATIONS_PAGE_SIZE,
        offset: notifications.length,
      });

      const mapped = mapNotificationRows(page.notifications);
      setNotifications((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const deduped = mapped.filter((item) => !seen.has(item.id));
        return [...prev, ...deduped];
      });

      setUnreadNotificationsCount(page.unreadCount);
      setNotificationsTotal(page.total);
      setNotificationsHasMore(
        notifications.length + page.notifications.length < page.total,
      );
    } finally {
      setLoadingMoreNotifications(false);
    }
  }, [
    canSeeNotifications,
    loadingMoreNotifications,
    mapNotificationRows,
    notifications.length,
    notificationsHasMore,
    NOTIFICATIONS_PAGE_SIZE,
  ]);

  const handleMarkNotificationRead = async (id: string) => {
    const previous = notifications;
    const previousUnreadCount = unreadNotificationsCount;
    const wasUnread = notifications.some(
      (notification) => notification.id === id && !notification.is_read,
    );

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, is_read: true }
          : notification,
      ),
    );
    if (wasUnread) {
      setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await markNotificationRead(id);
    } catch (error) {
      setNotifications(previous);
      setUnreadNotificationsCount(previousUnreadCount);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to mark notification as read.';
      toast.error(message, { position: 'top-center' });
      throw error;
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    const previous = notifications;
    const previousUnreadCount = unreadNotificationsCount;
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, is_read: true })),
    );
    setUnreadNotificationsCount(0);

    try {
      await markAllNotificationsRead();
    } catch (error) {
      setNotifications(previous);
      setUnreadNotificationsCount(previousUnreadCount);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to mark all notifications as read.';
      toast.error(message, { position: 'top-center' });
    }
  };

  const handleNotificationsScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const node = event.currentTarget;
      const remaining = node.scrollHeight - node.scrollTop - node.clientHeight;
      if (remaining <= 120) {
        void loadMoreNotifications();
      }
    },
    [loadMoreNotifications],
  );

  const handleLogOut = () => {
    setLogoutModalOpen(true);
    if (dropdownCloseTimerRef.current !== null) {
      window.clearTimeout(dropdownCloseTimerRef.current);
      dropdownCloseTimerRef.current = null;
    }
    setDropdownOpen(false);
    setDropdownClosing(false);
    setNotificationOpen(false);
    setMobileSidebarOpen(false);
  };

  const closeDropdown = useCallback(() => {
    if (!dropdownOpen || dropdownClosing) return;

    setDropdownClosing(true);
    dropdownCloseTimerRef.current = window.setTimeout(() => {
      setDropdownOpen(false);
      setDropdownClosing(false);
      dropdownCloseTimerRef.current = null;
    }, 180);
  }, [dropdownOpen, dropdownClosing]);

  const navigateWithConfirm = useCallback(
    (href: string, onAfterNavigate?: () => void) => {
      if (!shouldConfirmNavigation) {
        onAfterNavigate?.();
        router.push(href);
        return;
      }

      openDialog({
        title: 'Discard Changes?',
        message:
          'Are you sure you want to discard your changes? This action cannot be undone.',
        confirmText: 'Discard',
        cancelText: 'Cancel',
        isDangerous: true,
        onConfirm: () => {
          setHasUnsavedChanges(false);
          onAfterNavigate?.();
          router.push(href);
        },
        onCancel: () => {},
      });
    },
    [openDialog, router, setHasUnsavedChanges, shouldConfirmNavigation],
  );

  const handleNavigateHome = useCallback(() => {
    navigateWithConfirm('/');
  }, [navigateWithConfirm]);

  const handleProtectedLinkClick = useCallback(
    (
      event: MouseEvent<HTMLAnchorElement>,
      href: string,
      onAfterNavigate?: () => void,
    ) => {
      if (!shouldConfirmNavigation) {
        onAfterNavigate?.();
        return;
      }

      event.preventDefault();
      navigateWithConfirm(href, onAfterNavigate);
    },
    [navigateWithConfirm, shouldConfirmNavigation],
  );

  const openDropdown = useCallback(() => {
    if (dropdownCloseTimerRef.current !== null) {
      window.clearTimeout(dropdownCloseTimerRef.current);
      dropdownCloseTimerRef.current = null;
    }

    setDropdownClosing(false);
    setDropdownOpen(true);
  }, []);

  const toggleDropdown = useCallback(() => {
    if (dropdownOpen && !dropdownClosing) {
      closeDropdown();
      return;
    }
    openDropdown();
  }, [closeDropdown, dropdownOpen, dropdownClosing, openDropdown]);

  const refreshUnreadState = useCallback(async () => {
    if (!isAuth) {
      setHasUnreadMessages(false);
      return;
    }

    try {
      const conversations = await getConversations();
      const hasUnread = conversations.some(
        (conversation) => (conversation.unreadCount ?? 0) > 0,
      );
      setHasUnreadMessages(hasUnread);
    } catch {
      // Keep current state on transient errors.
    }
  }, [isAuth]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: globalThis.MouseEvent) => {
      const targetNode = e.target as Node;
      const clickedProfileTrigger = dropdownRef.current?.contains(targetNode);
      const clickedNotificationTrigger =
        notificationRef.current?.contains(targetNode);
      const clickedMobileNotificationPanel =
        mobileNotificationPanelRef.current?.contains(targetNode);
      const clickedMobileSidebarPanel =
        mobileSidebarPanelRef.current?.contains(targetNode);

      if (!clickedProfileTrigger) {
        closeDropdown();
      }

      if (!clickedNotificationTrigger && !clickedMobileNotificationPanel) {
        setNotificationOpen(false);
      }

      if (!clickedMobileSidebarPanel) {
        setMobileSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [closeDropdown]);

  useEffect(() => {
    return () => {
      if (dropdownCloseTimerRef.current !== null) {
        window.clearTimeout(dropdownCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    refreshUnreadState();
  }, [refreshUnreadState]);

  useEffect(() => {
    const onMessagesUpdated = () => {
      refreshUnreadState();
    };

    window.addEventListener('messages:updated', onMessagesUpdated);
    return () =>
      window.removeEventListener('messages:updated', onMessagesUpdated);
  }, [refreshUnreadState]);

  useEffect(() => {
    if (!isAuth) return;
    if (!pathname.startsWith('/messages')) return;

    refreshUnreadState();
  }, [isAuth, pathname, refreshUnreadState]);

  useEffect(() => {
    if (!canSeeNotifications) {
      setNotifications([]);
      setUnreadNotificationsCount(0);
      setNotificationsTotal(0);
      setNotificationsHasMore(false);
      return;
    }

    refreshNotifications();
  }, [canSeeNotifications, refreshNotifications]);

  useEffect(() => {
    if (!notificationOpen || !canSeeNotifications) return;
    refreshNotifications();
  }, [notificationOpen, canSeeNotifications, refreshNotifications]);

  return (
    <>
      <LogoutModal
        open={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
      />

      {/* Amber accent stripe */}
      <div className='fixed top-0 left-0 right-0 z-50 h-1 bg-amber-800' />

      {/* Main navbar */}
      <nav className='fixed top-1 left-0 right-0 z-50 bg-[#1a2235]/95 backdrop-blur-xs text-white shadow-lg border-b border-white/5'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3'>
          {/* ── LEFT: Branding ─────────────────────────────────── */}
          <button
            onClick={() => {
              handleNavigateHome();
            }}
            className='flex items-center gap-2 shrink-0 min-w-0 hover:opacity-80 transition-opacity'
          >
            <Image
              src='/logo.png'
              alt='P2P Marketplace'
              loading='eager'
              width={32}
              height={32}
              className='shrink-0'
            />
            <span className='font-bold text-base sm:text-lg leading-tight hidden sm:block whitespace-nowrap tracking-tight'>
              P2P Marketplace
            </span>
          </button>

          {/* ── CENTER: Tab navigation ──────────────────────────── */}
          <div className='hidden md:block'>
            <Suspense fallback={<TabsFallback />}>
              <NavTabsInner />
            </Suspense>
          </div>

          {/* ── RIGHT: Actions ──────────────────────────────────── */}
          <div className='flex items-center gap-1 shrink-0'>
            {/* Notification dropdown */}
            {canSeeNotifications && (
              <div className='relative' ref={notificationRef}>
                <button
                  onClick={() => setNotificationOpen((v) => !v)}
                  className='relative p-2 rounded-lg hover:bg-white/10 transition-colors'
                  aria-label='Notifications'
                >
                  <Bell size={18} className='text-stone-400' />
                  {hasUnreadNotifications && (
                    <span className='absolute right-0 bottom-0 w-2.5 h-2.5 rounded-full bg-amber-500 border border-[#1a2235]' />
                  )}
                </button>

                {notificationOpen && (
                  <div className='hidden md:block absolute right-0 mt-2 w-88 max-w-[90vw] rounded-lg border border-white/10 bg-[#1e2b3c] shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden'>
                    <div className='px-3 py-2.5 border-b border-white/10 bg-white/5 flex items-center justify-between gap-2'>
                      <h3 className='text-sm font-semibold text-white'>
                        Notifications
                      </h3>
                      <div className='flex items-center gap-2'>
                        <span className='text-[11px] text-stone-400'>
                          {notifications.length} items
                        </span>
                        <button
                          type='button'
                          onClick={handleMarkAllNotificationsRead}
                          disabled={!hasUnreadNotifications}
                          className='text-xs font-medium text-amber-300 hover:text-amber-200 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors'
                        >
                          Mark all as read
                        </button>
                      </div>
                    </div>

                    <div
                      ref={desktopNotificationsListRef}
                      onScroll={handleNotificationsScroll}
                      className='max-h-96 overflow-y-auto p-2 space-y-1.5'
                    >
                      {notifications.length === 0 ? (
                        <div className='px-2 py-8 text-center text-sm text-stone-400'>
                          No notifications yet.
                        </div>
                      ) : (
                        <>
                          {notifications.map((notification) => (
                            <NotificationItem
                              key={notification.id}
                              notification={notification}
                              onClick={handleMarkNotificationRead}
                            />
                          ))}
                          {loadingMoreNotifications && (
                            <div className='px-2 py-2 text-center text-xs text-stone-400'>
                              Loading more...
                            </div>
                          )}
                          {!notificationsHasMore &&
                            notificationsTotal > NOTIFICATIONS_PAGE_SIZE && (
                              <div className='px-2 py-2 text-center text-xs text-stone-500'>
                                End of notifications.
                              </div>
                            )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <ThemeModeSwitch compact className='shrink-0' />

            <button
              onClick={() => setMobileSidebarOpen(true)}
              className='md:hidden flex items-center justify-center p-2 rounded-lg hover:bg-white/10 transition-colors'
              aria-label='Open menu'
              aria-expanded={mobileSidebarOpen}
            >
              <Menu size={18} className='text-stone-300' />
            </button>

            {/* Profile dropdown */}
            <div className='relative hidden md:block' ref={dropdownRef}>
              <button
                onClick={toggleDropdown}
                className='flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors'
                aria-label='Account menu'
              >
                <div className='relative w-7 h-7'>
                  <div className='w-7 h-7 rounded-full bg-stone-600 overflow-hidden border border-white/20'>
                    <SafeImage
                      src={user?.profileImageUrl}
                      type='profile'
                      alt={`${user?.firstName}'s profile picture`}
                      width={28}
                      height={28}
                    />
                  </div>
                  {isAuth && hasUnreadMessages && (
                    <span className='absolute bottom-0 right-0 z-10 w-2.5 h-2.5 rounded-full bg-amber-500 border border-[#1a2235]' />
                  )}
                </div>
                <ChevronDown
                  size={13}
                  className={cn(
                    'text-stone-400 transition-transform duration-200',
                    dropdownOpen && !dropdownClosing && 'rotate-180',
                  )}
                />
              </button>

              {/* Dropdown panel */}
              {(dropdownOpen || dropdownClosing) && (
                <div
                  className={cn(
                    'hidden md:block absolute right-0 mt-2 w-48 bg-[#1e2b3c] border border-white/10 rounded-lg shadow-2xl overflow-hidden transition-all duration-200 z-50',
                    dropdownClosing
                      ? 'opacity-0 -translate-y-2'
                      : 'opacity-100 translate-y-0',
                  )}
                >
                  {isAuth ? (
                    <>
                      {/* User info */}
                      <div className='px-4 py-3 border-b border-white/10 bg-white/5'>
                        <p className='text-sm font-semibold text-white leading-tight flex items-center gap-1.5'>
                          {user?.firstName} {user?.lastName}
                          {<VerificationBadge verified={isVerifiedSeller} />}
                        </p>
                        <p className='text-xs text-stone-400 truncate mt-0.5'>
                          {user?.email}
                        </p>
                      </div>

                      <div className='py-1'>
                        {isAdmin ? (
                          <>
                            <Link
                              href='/admin'
                              onClick={closeDropdown}
                              className='flex items-center gap-3 px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors'
                            >
                              <LayoutDashboard
                                size={15}
                                className='text-stone-400'
                              />
                              Admin Dashboard
                            </Link>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                handleNavigateHome();
                                closeDropdown();
                              }}
                              className='flex items-center gap-3 px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors w-full text-left'
                            >
                              <Home size={15} className='text-stone-400' />
                              Home
                            </button>
                            <Link
                              href='/profile'
                              onClick={(event) =>
                                handleProtectedLinkClick(
                                  event,
                                  '/profile',
                                  closeDropdown,
                                )
                              }
                              className='flex items-center gap-3 px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors'
                            >
                              <User size={15} className='text-stone-400' />
                              Profile
                            </Link>
                            <Link
                              href='/messages'
                              onClick={(event) =>
                                handleProtectedLinkClick(
                                  event,
                                  '/messages',
                                  closeDropdown,
                                )
                              }
                              className='flex items-center gap-3 px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors'
                            >
                              <span className='relative inline-flex'>
                                <MessageCircle
                                  size={15}
                                  className='text-stone-400'
                                />
                                {hasUnreadMessages && (
                                  <span className='absolute -right-1 -bottom-1 w-2 h-2 rounded-full bg-amber-500 border border-[#1e2b3c]' />
                                )}
                              </span>
                              Messages
                            </Link>
                            {isVerifiedSeller ? (
                              <Link
                                href='/create'
                                onClick={(event) =>
                                  handleProtectedLinkClick(
                                    event,
                                    '/create',
                                    closeDropdown,
                                  )
                                }
                                className='flex items-center gap-3 px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors'
                              >
                                <Tag size={15} className='text-stone-400' />
                                Post a Listing
                              </Link>
                            ) : (
                              <Link
                                href='/become-seller'
                                onClick={(event) =>
                                  handleProtectedLinkClick(
                                    event,
                                    '/become-seller',
                                    closeDropdown,
                                  )
                                }
                                className='flex items-center gap-3 px-4 py-2.5 text-sm text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 transition-colors'
                              >
                                <UserPlus size={15} />
                                Become a Seller
                              </Link>
                            )}
                          </>
                        )}
                      </div>

                      <div className='border-t border-white/10' />
                      <button
                        onClick={handleLogOut}
                        className='flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors'
                      >
                        <LogOut size={15} />
                        Log Out
                      </button>
                    </>
                  ) : (
                    <div className='py-1'>
                      <button
                        onClick={() => {
                          handleNavigateHome();
                          closeDropdown();
                        }}
                        className='flex items-center gap-3 px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors w-full text-left'
                      >
                        <Home size={15} className='text-stone-400' />
                        Home
                      </button>
                      <Link
                        href='/login'
                        onClick={(event) =>
                          handleProtectedLinkClick(
                            event,
                            '/login',
                            closeDropdown,
                          )
                        }
                        className='flex items-center gap-3 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors'
                      >
                        <User size={15} className='text-stone-400' />
                        Log In
                      </Link>
                      <Link
                        href='/signup'
                        onClick={(event) =>
                          handleProtectedLinkClick(
                            event,
                            '/signup',
                            closeDropdown,
                          )
                        }
                        className='flex items-center gap-3 px-4 py-3 text-sm font-semibold text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 transition-colors'
                      >
                        <UserPlus size={15} />
                        Create Account
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile notifications sidebar */}
      <>
        <div
          className={cn(
            'md:hidden fixed inset-0 z-62 bg-black/35 transition-opacity duration-300 ease-out',
            notificationOpen
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0',
          )}
          onClick={() => setNotificationOpen(false)}
        />

        <div
          ref={mobileNotificationPanelRef}
          className={cn(
            'md:hidden fixed right-0 top-1 bottom-0 z-63 flex w-[min(86vw,22rem)] flex-col border-l border-white/10 bg-[#1e2b3c] shadow-2xl overflow-hidden transition-transform duration-300 ease-out will-change-transform',
            notificationOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className='border-b border-white/10 bg-white/5 px-4 py-4'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <h3 className='text-sm font-semibold text-white'>
                  Notifications
                </h3>
                <p className='mt-1 text-[11px] text-stone-400'>
                  {notifications.length} items
                </p>
              </div>
              <button
                type='button'
                onClick={() => setNotificationOpen(false)}
                className='rounded-lg p-2 text-stone-300 hover:bg-white/10 transition-colors'
                aria-label='Close notifications'
              >
                <X size={18} />
              </button>
            </div>
            <button
              type='button'
              onClick={handleMarkAllNotificationsRead}
              disabled={!hasUnreadNotifications}
              className='mt-3 text-[11px] font-medium text-amber-300 hover:text-amber-200 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors'
            >
              Mark all as read
            </button>
          </div>

          <div
            ref={mobileNotificationsListRef}
            onScroll={handleNotificationsScroll}
            className='flex-1 overflow-y-auto px-3 py-3 space-y-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]'
          >
            {notifications.length === 0 ? (
              <div className='px-2 py-8 text-center text-sm text-stone-400'>
                No notifications yet.
              </div>
            ) : (
              <>
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={handleMarkNotificationRead}
                  />
                ))}
                {loadingMoreNotifications && (
                  <div className='px-2 py-2 text-center text-xs text-stone-400'>
                    Loading more...
                  </div>
                )}
                {!notificationsHasMore &&
                  notificationsTotal > NOTIFICATIONS_PAGE_SIZE && (
                    <div className='px-2 py-2 text-center text-xs text-stone-500'>
                      End of notifications.
                    </div>
                  )}
              </>
            )}
          </div>
        </div>
      </>

      {/* Mobile sidebar menu */}
      <>
        <div
          className={cn(
            'md:hidden fixed inset-0 z-60 bg-black/40 transition-opacity duration-300 ease-out',
            mobileSidebarOpen
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0',
          )}
          onClick={() => setMobileSidebarOpen(false)}
        />

        <div
          ref={mobileSidebarPanelRef}
          className={cn(
            'md:hidden fixed left-0 top-1 bottom-0 z-61 flex w-[min(86vw,22rem)] flex-col border-r border-white/10 bg-[#1e2b3c] shadow-2xl transition-transform duration-300 ease-out will-change-transform',
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className='relative border-b border-white/10 bg-white/5 px-4 py-4 pr-14'>
            <div className='flex items-start gap-3 min-w-0'>
              <div className='mt-0.5 rounded-xl bg-white/5 p-2'>
                <Image
                  src='/logo.png'
                  alt='P2P Marketplace'
                  width={24}
                  height={24}
                />
              </div>
              <div className='min-w-0'>
                <p className='text-sm font-semibold text-white truncate'>
                  P2P Marketplace
                </p>
                <p className='mt-1 text-xs leading-5 text-stone-400'>
                  Browse and manage your account
                </p>
              </div>
            </div>
            <button
              type='button'
              onClick={() => setMobileSidebarOpen(false)}
              className='absolute right-3 top-3 rounded-lg p-2 text-stone-300 hover:bg-white/10 transition-colors'
              aria-label='Close menu'
            >
              <X size={18} />
            </button>
          </div>

          <div className='flex-1 overflow-y-auto px-4 py-4'>
            <div className='mb-5'>
              <p className='px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500'>
                Browse
              </p>
              <Suspense fallback={<MobileTabsFallback />}>
                <NavTabsInner
                  vertical
                  onNavigate={() => setMobileSidebarOpen(false)}
                />
              </Suspense>
            </div>

            {isAuth ? (
              <>
                {/* User info */}
                <div className='mb-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3'>
                  <p className='text-sm font-semibold text-white leading-tight flex items-center gap-1.5'>
                    {user?.firstName} {user?.lastName}
                    {<VerificationBadge verified={isVerifiedSeller} />}
                  </p>
                  <p className='text-xs text-stone-400 truncate mt-0.5'>
                    {user?.email}
                  </p>
                </div>

                <div className='py-1'>
                  <p className='px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500'>
                    Account
                  </p>
                  {isAdmin ? (
                    <>
                      <Link
                        href='/admin'
                        onClick={() => setMobileSidebarOpen(false)}
                        className='flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors'
                      >
                        <LayoutDashboard size={15} className='text-stone-400' />
                        Admin Dashboard
                      </Link>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          handleNavigateHome();
                          setMobileSidebarOpen(false);
                        }}
                        className='flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors w-full text-left'
                      >
                        <Home size={15} className='text-stone-400' />
                        Home
                      </button>
                      <Link
                        href='/profile'
                        onClick={(event) =>
                          handleProtectedLinkClick(event, '/profile', () =>
                            setMobileSidebarOpen(false),
                          )
                        }
                        className='flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors'
                      >
                        <User size={15} className='text-stone-400' />
                        Profile
                      </Link>
                      <Link
                        href='/messages'
                        onClick={(event) =>
                          handleProtectedLinkClick(event, '/messages', () =>
                            setMobileSidebarOpen(false),
                          )
                        }
                        className='flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors'
                      >
                        <span className='relative inline-flex'>
                          <MessageCircle size={15} className='text-stone-400' />
                          {hasUnreadMessages && (
                            <span className='absolute -right-1 -bottom-1 w-2 h-2 rounded-full bg-amber-500 border border-[#1e2b3c]' />
                          )}
                        </span>
                        Messages
                      </Link>
                      {isVerifiedSeller ? (
                        <Link
                          href='/create'
                          onClick={(event) =>
                            handleProtectedLinkClick(event, '/create', () =>
                              setMobileSidebarOpen(false),
                            )
                          }
                          className='flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors'
                        >
                          <Tag size={15} className='text-stone-400' />
                          Post a Listing
                        </Link>
                      ) : (
                        <Link
                          href='/become-seller'
                          onClick={(event) =>
                            handleProtectedLinkClick(
                              event,
                              '/become-seller',
                              () => setMobileSidebarOpen(false),
                            )
                          }
                          className='flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 transition-colors'
                        >
                          <UserPlus size={15} />
                          Become a Seller
                        </Link>
                      )}
                    </>
                  )}
                </div>

                <div className='mt-4 border-t border-white/10 pt-4' />
                <button
                  onClick={handleLogOut}
                  className='flex items-center gap-3 w-full rounded-xl px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors'
                >
                  <LogOut size={15} />
                  Log Out
                </button>
              </>
            ) : (
              <div className='py-1'>
                <p className='px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500'>
                  Account
                </p>
                <button
                  onClick={() => {
                    handleNavigateHome();
                    setMobileSidebarOpen(false);
                  }}
                  className='flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors w-full text-left'
                >
                  <Home size={15} className='text-stone-400' />
                  Home
                </button>
                <Link
                  href='/login'
                  onClick={(event) =>
                    handleProtectedLinkClick(event, '/login', () =>
                      setMobileSidebarOpen(false),
                    )
                  }
                  className='flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors'
                >
                  <User size={15} className='text-stone-400' />
                  Log In
                </Link>
                <Link
                  href='/signup'
                  onClick={(event) =>
                    handleProtectedLinkClick(event, '/signup', () =>
                      setMobileSidebarOpen(false),
                    )
                  }
                  className='flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 transition-colors'
                >
                  <UserPlus size={15} />
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      </>

      {/* Spacer for fixed navbar (1px stripe + 56px nav) */}
      <div className='h-15' />
    </>
  );
}
