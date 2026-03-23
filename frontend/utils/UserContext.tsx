"use client";

import { createContext, useCallback, useContext, useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User } from "@/types/forms";
import { LoadingPage } from "@/components/loading";
import { validateImageURL } from "@/utils/validation";
import { sendDeleteRequest, sendGetRequest } from "@/services/authService";

interface UserContextType {
  user: User | null;
  isAuth: boolean;
  isUserOnline: (userId?: string | null) => boolean;
  saveUserData: (userData: User) => void;
  clearUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);
const PUBLIC_ROUTES = [
  "/",
  "/signup",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/listing",
  "/not-found",
];
const AUTH_ROUTES = [
  "/signup",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];
const ADMIN_ROUTES = [
  "/admin",
];
const SHARED_AUTH_ROUTES = [
  "/listing",
  "/profile",
];
const KNOWN_APP_ROUTES = [
  "/",
  "/signup",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/listing",
  "/become-seller",
  "/create",
  "/messages",
  "/profile",
  "/admin",
  "/not-found",
];
const STORAGE_KEY = "auth_user";

function setRoleCookie(role?: string) {
  if (typeof document === "undefined") return;

  const normalized = (role ?? "").trim().toUpperCase();
  if (!normalized) {
    document.cookie = "app_role=; path=/; max-age=0; samesite=lax";
    return;
  }

  document.cookie = `app_role=${encodeURIComponent(normalized)}; path=/; samesite=lax`;
}

function getRealtimeSocketURL(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiUrl) return "";

  try {
    const url = new URL(apiUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws";
    url.search = "";
    return url.toString();
  } catch {
    return "";
  }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isAuth, setIsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [presenceByUserId, setPresenceByUserId] = useState<Record<string, boolean>>({});

  const applyPresenceUpdate = useCallback((userId?: string, isOnline?: boolean) => {
    const normalizedUserId = (userId ?? "").trim();
    if (!normalizedUserId) return;

    setPresenceByUserId((prev) => {
      const nextValue = Boolean(isOnline);
      if (prev[normalizedUserId] === nextValue) return prev;
      return {
        ...prev,
        [normalizedUserId]: nextValue,
      };
    });
  }, []);

  const isUserOnline = useCallback((userId?: string | null) => {
    const normalizedUserId = (userId ?? "").trim();
    if (!normalizedUserId) return false;
    return Boolean(presenceByUserId[normalizedUserId]);
  }, [presenceByUserId]);

  const normalizePath = (path: string): string => {
    const normalized = path.replace(/\/+$/, "");
    return normalized === "" ? "/" : normalized;
  };

  const currentPath = normalizePath(pathname);

  const isRouteRootMatch = (route: string): boolean => {
    const routeRoot = normalizePath(route);
    if (routeRoot === "/") return currentPath === "/";
    return currentPath === routeRoot || currentPath.startsWith(`${routeRoot}/`);
  };

  const isPublicRoute = PUBLIC_ROUTES.some(isRouteRootMatch);
  const isAuthRoute = AUTH_ROUTES.some(isRouteRootMatch);
  const isAdminRoute = ADMIN_ROUTES.some(isRouteRootMatch);
  const isSharedAuthRoute = SHARED_AUTH_ROUTES.some(isRouteRootMatch);
  const isKnownAppRoute = KNOWN_APP_ROUTES.some(isRouteRootMatch);
  const isAdminRole = ["ADMIN", "SUPER_ADMIN"].includes((user?.role ?? "").toUpperCase());

  useEffect(() => {
    if (!isAuth) return;

    let ws: WebSocket | null = null;
    let pingInterval: ReturnType<typeof setInterval> | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let closedByCleanup = false;

    const wsUrl = getRealtimeSocketURL();
    if (!wsUrl) return;

    const connect = () => {
      if (closedByCleanup) return;

      let wasEverOpen = false;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        wasEverOpen = true;
        window.dispatchEvent(new Event("messages:updated"));

        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25_000);
      };

      ws.onmessage = (evt) => {
        try {
          const parsed = JSON.parse(evt.data) as { type?: string; data?: any };

          if (parsed.type === "presence:update") {
            const presenceData = parsed.data as { userId?: string; isOnline?: boolean };
            applyPresenceUpdate(presenceData?.userId, presenceData?.isOnline);
            window.dispatchEvent(new CustomEvent("realtime:presence", { detail: parsed.data }));
            window.dispatchEvent(new Event("messages:updated"));
            return;
          }

          if (parsed.type === "presence:snapshot") {
            const onlineUserIds = Array.isArray((parsed.data as { onlineUserIds?: unknown })?.onlineUserIds)
              ? ((parsed.data as { onlineUserIds?: unknown[] }).onlineUserIds ?? [])
              : [];

            const next: Record<string, boolean> = {};
            for (const value of onlineUserIds) {
              const id = typeof value === "string" ? value.trim() : "";
              if (id) next[id] = true;
            }

            setPresenceByUserId(next);

            window.dispatchEvent(new Event("messages:updated"));
            return;
          }

          if (parsed.type === "presence:connected") {
            const connectedUserId = (parsed.data as { userId?: string })?.userId;
            applyPresenceUpdate(connectedUserId, true);
            window.dispatchEvent(new Event("messages:updated"));
            return;
          }

          if (parsed.type === "message:new") {
            window.dispatchEvent(new CustomEvent("realtime:message", { detail: parsed.data }));
            window.dispatchEvent(new Event("messages:updated"));
            return;
          }

          if (parsed.type === "reaction:update") {
            window.dispatchEvent(new CustomEvent("realtime:reaction", { detail: parsed.data }));
            return;
          }

          if (parsed.type === "message:read") {
            window.dispatchEvent(new CustomEvent("realtime:read", { detail: parsed.data }));
            window.dispatchEvent(new Event("messages:updated"));
            return;
          }

          if (parsed.type === "message:status") {
            window.dispatchEvent(new CustomEvent("realtime:status", { detail: parsed.data }));
            return;
          }

          if (parsed.type === "message:edit") {
            window.dispatchEvent(new CustomEvent("realtime:message-edit", { detail: parsed.data }));
            window.dispatchEvent(new Event("messages:updated"));
            return;
          }

          if (parsed.type === "message:unsend") {
            window.dispatchEvent(new CustomEvent("realtime:message-unsend", { detail: parsed.data }));
            window.dispatchEvent(new Event("messages:updated"));
            return;
          }

          if (parsed.type === "listing:status") {
            window.dispatchEvent(new CustomEvent("realtime:listing-status", { detail: parsed.data }));
            window.dispatchEvent(new Event("messages:updated"));
          }
        } catch {
          // Ignore malformed realtime payloads.
        }
      };

      ws.onclose = (event) => {
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }

        if (closedByCleanup) return;

        // If the connection was never successfully opened, the server rejected the WebSocket handshake
        // Most likely because the session is invalid or the account was deactivated.
        const isAuthRejection =
          !wasEverOpen &&
          (event.code === 1006 || (event.code >= 4000 && event.code <= 4099));

        if (isAuthRejection) {
          void clearUserData();
          return;
        }

        reconnectTimeout = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    
    connect();

    return () => {
      closedByCleanup = true;
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [applyPresenceUpdate, isAuth]);

  // Save user data during login
  const saveUserData = (userData: User) => {
    console.log("Logged User Data:", userData);
    setUser(userData);
    setIsAuth(true);
    setRoleCookie(userData.role);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  };

  // Clear user saved data after logout
  const clearUserData = async () => {
    try {
      await sendDeleteRequest("/auth/logout");
    } finally {
      // Clear user data and validation state regardless of logout success
      // But the session cookie will remain incase of server error
      setUser(null);
      setIsAuth(false);
      setPresenceByUserId({});
      setRoleCookie("");
      localStorage.removeItem(STORAGE_KEY);
      router.replace("/login");
    }
  };

  // Validate user on mount
  useEffect(() => {
    const validateUser = async () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const userData = JSON.parse(stored) as User;
        if (userData) {
          saveUserData(userData);
          setIsLoading(false);
          return;
        }
      }

      try {
        // If the client has a stored session cookie (HTTP only)
        if (document.cookie.includes("session_token")) {
          const user = await sendGetRequest("/auth/me", true);
          saveUserData(user);
        }
      } catch {
        setUser(null);
        setIsAuth(false);
        setPresenceByUserId({});
        setRoleCookie("");
      } finally {
        setIsLoading(false);
      }
    };

    validateUser();
  }, []);

  useEffect(() => {
    setUser((prev) => {
      if (!prev) return prev;

      const profile_image_url = (prev.profileImageUrl ?? "/profile-icon.png").trim();
      const cover_image_url = (prev.coverImageUrl ?? "/cover-placeholder.jpg").trim();
      const nextProfileImageUrl = validateImageURL(profile_image_url);
      const nextCoverImageUrl = validateImageURL(cover_image_url);

      if (
        prev.profileImageUrl === nextProfileImageUrl &&
        prev.coverImageUrl === nextCoverImageUrl
      ) {
        return prev;
      }

      return {
        ...prev,
        profileImageUrl: nextProfileImageUrl,
        coverImageUrl: nextCoverImageUrl,
      };
    });
  }, [user]);

  // Handle route protection on client navigation/history traversal
  useEffect(() => {
    if (isLoading) return;

    if (isAuth && isAuthRoute) {
      router.replace(isAdminRole ? "/admin" : "/");
      return;
    }

    if (isAuth && isAdminRole && !isAdminRoute && !isSharedAuthRoute) {
      router.replace("/admin");
      return;
    }

    if (isAuth && !isAdminRole && isAdminRoute) {
      router.replace("/");
      return;
    }

    if (!isAuth && !isPublicRoute) {
      if (!isKnownAppRoute) {
        router.replace("/not-found");
        return;
      }
      router.replace("/login");
    }
  }, [isAdminRole, isAdminRoute, isAuth, isAuthRoute, isKnownAppRoute, isPublicRoute, isSharedAuthRoute, isLoading, router]);

  // Guard against BFCache restoring a protected page after logout
  useEffect(() => {
    const onPageShow = () => {
      const storedUser = localStorage.getItem(STORAGE_KEY);
      const hasSession = document.cookie.includes("session_token");

      if (!storedUser || !hasSession) {
        setUser(null);
        setIsAuth(false);
        setRoleCookie("");

        if (!isPublicRoute) {
          router.replace("/login");
        }
      }
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [isPublicRoute, router]);

  if (isLoading) return (<LoadingPage />);

  return (
    <UserContext.Provider value={{ user, isAuth, isUserOnline, saveUserData, clearUserData }}>
      {children}
    </UserContext.Provider>
  );
}



export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within a UserProvider");
  return context;
}
