"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface User {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
}

interface UserContextType {
  user: User | null;
  isValidated: boolean;
  saveUserData: (userData: User) => void;
  clearUserData: () => void;
}

const UserContext = createContext<UserContextType | null>(null);
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/forgot-password"];
const PROTECTED_AUTH_ROUTES = ["/login", "/signup"];
const STORAGE_KEY = "auth_user";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isProtectedAuthRoute = PROTECTED_AUTH_ROUTES.includes(pathname);

  const [user, setUser] = useState<User | null>(null);
  const [isValidated, setIsValidated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Save user data during login
  const saveUserData = (userData: User) => {
    console.log("Logged User Data:", userData);
    setUser(userData);
    setIsValidated(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  };

  // Clear user saved data after logout
  const clearUserData = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
        method: "DELETE",
        credentials: "include",
      });
    } finally {
      // Clear user data and validation state regardless of logout success
      setUser(null);
      setIsValidated(false);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const validateUser = async () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const userData = JSON.parse(stored);
      setUser(userData);
      setIsValidated(true);
      setIsLoading(false);
      return;
    }

    try {
      // If the client has a stored session cookie
      if (document.cookie.includes("session_token")) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          setUser(null);
          setIsValidated(false);
          return;
        }

        const json = await res.json();
        saveUserData(json.data.user);
      }
    } catch {
      setUser(null);
      setIsValidated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Validate user on mount
  useEffect(() => {
    validateUser();
  }, []);

  // Handle route protection
  useEffect(() => {
    if (isValidated || isPublicRoute) {
      setIsLoading(false);
      return;
    }
    else router.push("/login");
  }, [pathname]);

  if (isLoading) {
    return null; // or a loading spinner
  }

  return (
    <UserContext.Provider value={{ user, isValidated, saveUserData, clearUserData }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within a UserProvider");
  return context;
}
