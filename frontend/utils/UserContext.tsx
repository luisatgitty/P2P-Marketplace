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

export function UserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const [user, setUser] = useState<User | null>(null);
  const [isValidated, setIsValidated] = useState(false);

  // Save user data during login
  const saveUserData = (userData: User) => {
    console.log("Logged User Data:", userData);
    setUser(userData);
    setIsValidated(true);
  };

  // Clear user saved data after logout
  const clearUserData = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
        method: "DELETE",
        credentials: "include",
      });
    } finally {
      setUser(null);
      setIsValidated(false);
    }
  };

  // Validate user on mount
  useEffect(() => {
    const validateUser = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          setIsValidated(false);
          return;
        }

        const json = await res.json();
        saveUserData(json.data.user);

      } catch {
        setIsValidated(false);
      }
    };

    validateUser();
  }, []);

  // Handle route protection
  useEffect(() => {
    if (isValidated || isPublicRoute) return;
    else router.push("/login");
  }, [pathname]);

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
