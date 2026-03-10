"use client";

import Image from "next/image";
import Link from "next/link";
import { useUser } from "@/utils/UserContext";
import { useTheme } from "@/utils/ThemeContext";
import SearchBar from "./ui/search-bar";
import { MessageCircle, Sun, Moon } from "lucide-react";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

export default function Navbar() {
  const { clearUserData, isValidated, user } = useUser();
  const isSeller = user?.status === "verified";
  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "?";

  const avatarSrc =
    typeof window !== "undefined" ? localStorage.getItem("profile_avatar") : null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1e2433] text-white px-3 py-2 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">

        {/* Left: logo + brand + search */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/logo.png" alt="Logo" width={36} height={36} className="rounded-lg" />
            <span className="font-bold text-base hidden sm:block text-white whitespace-nowrap">
              P2P Marketplace
            </span>
          </Link>
          <div className="flex-1 min-w-0 max-w-sm">
            <SearchBar className="w-full text-sm" />
          </div>
        </div>

        {/* Right: nav links + theme toggle */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Link
            href="/"
            className="text-sm px-3 py-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors whitespace-nowrap"
          >
            Home
          </Link>

          {isValidated ? (
            <>
              {isSeller && (
                <Link
                  href="/create"
                  className="text-sm px-3 py-2 rounded-lg text-amber-300 hover:bg-amber-400/10 hover:text-amber-200 transition-colors whitespace-nowrap font-medium"
                >
                  + Post
                </Link>
              )}

              <Link
                href="/messages"
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Messages</span>
              </Link>

              <ThemeToggle />

              <Link
                href="/profile"
                className="flex items-center justify-center w-9 h-9 rounded-full overflow-hidden border-2 border-white/20 hover:border-white/50 transition-colors ml-0.5"
                title="My Profile"
              >
                {avatarSrc ? (
                  <Image src={avatarSrc} alt="Profile" width={36} height={36} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-xs font-bold text-white">
                    {initials}
                  </div>
                )}
              </Link>

              <button
                onClick={clearUserData}
                className="text-sm px-3 py-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors whitespace-nowrap"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <ThemeToggle />
              <Link
                href="/login"
                className="text-sm px-3 py-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors whitespace-nowrap"
              >
                Log In
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
