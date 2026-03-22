"use client";

import { useState } from "react";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { useUser } from "@/utils/UserContext";
import { cn } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────
export interface LogoutModalProps {
  open: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function LogoutModal({ open, onClose }: LogoutModalProps) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const { clearUserData, user } = useUser();

  if (!open) return null;

  // Derive initials for the avatar
  const userName =
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "User";
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  async function handleConfirm() {
    setState("loading");
    try {
      await clearUserData();
      setState("idle");
    } finally {
      setState("idle");
      onClose();
    }
  }

  function handleCancel() {
    if (state === "loading") return;
    setState("idle");
    onClose();
  }

  return (
    /* ── Backdrop ── */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && handleCancel()}
    >
      {/* ── Modal card ── */}
      <div className="bg-[#1c1f2e] rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        {state !== "done" && (
          <>
            <div className="bg-[#1e2433] px-7 py-7 flex flex-col items-center text-center">
              {/* Layered icon rings */}
              <div className="relative mb-5">
                <div className="w-16 h-16 rounded-full border border-red-500/20 bg-red-500/10 flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full border border-red-500/25 bg-red-500/10 flex items-center justify-center">
                    <LogOut
                      className="w-5 h-5 text-red-400"
                      strokeWidth={1.75}
                    />
                  </div>
                </div>
              </div>

              <h2 className="text-base font-bold text-slate-100 leading-snug mb-2">
                Sign out of your account?
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed max-w-60">
                Your active session will end. You&apos;ll need to log in again
                to have full access to all features.
              </p>
            </div>

            <div className="bg-white dark:bg-[#1c1f2e] px-6 py-5 flex flex-col gap-3">
              {/* Session info chip */}
              <div className="flex items-center gap-3 bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl px-3.5 py-2.5">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full overflow-hidden border border-stone-200 dark:border-[#2a2d3e] bg-stone-200 dark:bg-stone-700 shrink-0 relative">
                  <Image
                    src={user?.profileImageUrl || "/profile-icon.png"}
                    alt={userName}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                  {(user?.profileImageUrl === "/profile-icon.png") && (
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-stone-700 dark:text-stone-100">
                      {initials}
                    </span>
                  )}
                </div>
                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-stone-800 dark:text-stone-100 truncate">
                    {userName}
                  </p>
                  {user?.email && (
                    <p className="text-xs text-stone-400 dark:text-stone-500 truncate">
                      {user.email}
                    </p>
                  )}
                </div>
                {/* Active session dot */}
                <span
                  className="w-2 h-2 rounded-full bg-blue-500 shrink-0"
                  title="Active session"
                />
              </div>

              {/* Confirm button */}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={state === "loading"}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3 rounded-full",
                  "bg-red-600 hover:bg-red-700 text-white text-sm font-bold",
                  "transition-all active:scale-[0.98]",
                  "disabled:opacity-70 disabled:cursor-not-allowed",
                )}
              >
                {state === "loading" ? (
                  <>
                    {/* Inline spinner */}
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing out…</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Yes, sign me out</span>
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-stone-200 dark:bg-[#2a2d3e]" />
                <span className="text-xs text-stone-400 dark:text-stone-600">
                  or
                </span>
                <div className="flex-1 h-px bg-stone-200 dark:bg-[#2a2d3e]" />
              </div>

              {/* Cancel button */}
              <button
                type="button"
                onClick={handleCancel}
                disabled={state === "loading"}
                className={cn(
                  "w-full py-3 rounded-full border-2 border-stone-200 dark:border-[#2a2d3e]",
                  "text-stone-600 dark:text-stone-300 text-sm font-semibold",
                  "hover:border-stone-400 dark:hover:border-stone-500",
                  "hover:bg-stone-50 dark:hover:bg-[#252837]",
                  "transition-all active:scale-[0.98]",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                Stay signed in
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
