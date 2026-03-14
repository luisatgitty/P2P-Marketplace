"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useState, useRef, useEffect } from "react";
import { useUser } from "@/utils/UserContext";
import { useTheme } from "next-themes";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Sun, Moon, MessageCircle, LogOut, User,
  ChevronDown, Tag, Store, Wrench, LayoutGrid, UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  { label: "All",      value: "all",     icon: LayoutGrid },
  { label: "Buy",      value: "sell",    icon: Tag        },
  { label: "Rent",     value: "rent",    icon: Store      },
  { label: "Services", value: "service", icon: Wrench     },
];

// ─── Center tabs (needs Suspense because of useSearchParams) ───────────────────
function NavTabsInner() {
  const searchParams = useSearchParams();
  const router        = useRouter();
  const activeType    = searchParams.get("type") || "all";

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
        const isActive = activeType === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => handleTabClick(tab.value)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 select-none",
              isActive
                ? "bg-amber-700 text-white shadow-sm"
                : "text-stone-400 hover:text-white hover:bg-white/10"
            )}
          >
            <tab.icon size={13} className="shrink-0" />
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
  const { clearUserData, isValidated, user } = useUser();
  const { theme, setTheme } = useTheme();
  const isVerifiedSeller = (user?.status ?? "").toLowerCase() === "verified";
  const [dropdownOpen, setDropdownOpen]     = useState(false);
  const [mounted, setMounted]               = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Avoid hydration mismatch for theme
  useEffect(() => setMounted(true), []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      {/* Amber accent stripe */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-amber-800" />

      {/* Main navbar */}
      <nav className="fixed top-1 left-0 right-0 z-50 bg-[#1a2235]/95 backdrop-blur-sm text-white shadow-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">

          {/* ── LEFT: Branding ─────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-2 shrink-0 min-w-0">
            <Image
              src="/logo.png"
              alt="P2P Marketplace"
              width={32}
              height={32}
              className="rounded-md shrink-0"
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

            {/* Dark mode toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "dark"
                  ? <Sun size={17} className="text-amber-400" />
                  : <Moon size={17} className="text-stone-300" />
                }
              </button>
            )}

            {/* Profile dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Account menu"
              >
                <div className="w-7 h-7 rounded-full bg-stone-600 overflow-hidden border border-white/20">
                  <Image
                    src={user?.profileImageUrl || '/profile-icon.png'}
                    alt="Profile"
                    width={28}
                    height={28}
                    className="w-full h-full object-cover"
                  />
                </div>
                <ChevronDown
                  size={13}
                  className={cn("text-stone-400 transition-transform duration-200", dropdownOpen && "rotate-180")}
                />
              </button>

              {/* Dropdown panel */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#1e2b3c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {isValidated ? (
                    <>
                      {/* User info */}
                      <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                        <p className="text-sm font-semibold text-white leading-tight">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs text-stone-400 truncate mt-0.5">{user?.email}</p>
                      </div>

                      <div className="py-1">
                        <Link
                          href="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <User size={15} className="text-stone-400" />
                          My Profile
                        </Link>
                        <Link
                          href="/messages"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-200 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <MessageCircle size={15} className="text-stone-400" />
                          Messages
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
                      </div>

                      <div className="border-t border-white/10" />
                      <button
                        onClick={() => { clearUserData(); setDropdownOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                      >
                        <LogOut size={15} />
                        Log Out
                      </button>
                    </>
                  ) : (
                    <div className="py-1">
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
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer for fixed navbar (1px stripe + 56px nav) */}
      <div className="h-14.25" />
    </>
  );
}
