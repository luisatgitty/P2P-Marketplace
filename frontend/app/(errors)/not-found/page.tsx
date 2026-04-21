"use client";

import Link from "next/link";
import { SearchX, Home, Compass, ShoppingBag, Wrench, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Browse suggestion cards ───────────────────────────────────────────────────
const SUGGESTIONS = [
  {
    label: "For Sale",
    desc:  "Browse items for sale",
    href:  "/?type=sell",
    Icon:  ShoppingBag,
    color: "text-stone-600 dark:text-stone-300",
    bg:    "bg-stone-100 dark:bg-stone-800/50",
    border:"border-stone-200 dark:border-stone-700",
    hover: "hover:border-stone-400 dark:hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-[#252837]",
  },
  {
    label: "For Rent",
    desc:  "Explore rentals",
    href:  "/?type=rent",
    Icon:  Tag,
    color: "text-teal-700 dark:text-teal-400",
    bg:    "bg-teal-50 dark:bg-teal-950/30",
    border:"border-teal-200 dark:border-teal-800",
    hover: "hover:border-teal-400 dark:hover:border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50",
  },
  {
    label: "Services",
    desc:  "Find local services",
    href:  "/?type=service",
    Icon:  Wrench,
    color: "text-violet-700 dark:text-violet-400",
    bg:    "bg-violet-50 dark:bg-violet-950/30",
    border:"border-violet-200 dark:border-violet-800",
    hover: "hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/50",
  },
];

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-stone-100 dark:bg-[#0f1117] flex flex-col">

      {/* ── Top accent bar ── */}
      <div className="h-1 w-full bg-gradient-to-r from-[#1e2433] via-[#3a4a6a] to-[#1e2433] flex-shrink-0" />

      {/* ── Main content ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">

          {/* ── Card ── */}
          <div className="bg-white dark:bg-[#1c1f2e] rounded-lg border border-stone-200 dark:border-[#2a2d3e] shadow-sm overflow-hidden">

            {/* Card header */}
            <div className="bg-[#1e2433] px-8 py-10 flex flex-col items-center text-center relative overflow-hidden">

              {/* Decorative background rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-72 h-72 rounded-full border border-white/[0.04]" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-52 h-52 rounded-full border border-white/[0.05]" />
              </div>

              {/* Large "404" typographic element */}
              <div className="relative mb-5 select-none">
                {/* Ghost number behind the icon */}
                <p
                  className="text-[88px] font-extrabold leading-none tracking-tighter"
                  style={{
                    color: "transparent",
                    WebkitTextStroke: "1.5px rgba(255,255,255,0.07)",
                    userSelect: "none",
                  }}
                >
                  404
                </p>

                {/* Floating icon centred over the ghost number */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-stone-700/30 border border-stone-600/30 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-stone-600/30 border border-stone-500/30 flex items-center justify-center">
                      <SearchX
                        className="w-7 h-7 text-stone-300"
                        strokeWidth={1.75}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Error code label */}
              <p className="text-[11px] font-bold text-stone-500 uppercase tracking-[0.2em] mb-1.5">
                Error 404
              </p>

              {/* Heading */}
              <h1 className="text-2xl font-extrabold text-white leading-tight mb-2.5">
                Page Not Found
              </h1>

              {/* Description */}
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                The page you&apos;re looking for doesn&apos;t exist, may have
                been removed, or the link might be incorrect.
              </p>
            </div>

            {/* ── Card body ── */}
            <div className="px-8 py-7 flex flex-col gap-6">

              {/* Primary CTAs */}
              <div className="flex flex-col gap-2.5">
                <Link
                  href="/"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #1e2433 0%, #3a4a6a 100%)" }}
                >
                  <Home className="w-4 h-4" />
                  Back to Home
                </Link>

                <Link
                  href="/"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border-2 border-stone-200 dark:border-[#2a2d3e] text-stone-700 dark:text-stone-200 text-sm font-semibold hover:border-stone-400 dark:hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-[#252837] transition-all"
                >
                  <Compass className="w-4 h-4" />
                  Browse All Listings
                </Link>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-stone-200 dark:bg-[#2a2d3e]" />
                <span className="text-xs text-stone-400 dark:text-stone-600 shrink-0">
                  or browse by type
                </span>
                <div className="flex-1 h-px bg-stone-200 dark:bg-[#2a2d3e]" />
              </div>

              {/* Browse suggestion cards */}
              <div className="grid grid-cols-3 gap-2.5">
                {SUGGESTIONS.map(({ label, desc, href, Icon, color, bg, border, hover }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex flex-col items-center gap-2 px-2 py-4 rounded-lg border text-center transition-all",
                      bg, border, hover,
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center",
                      "bg-white dark:bg-[#1c1f2e]",
                      "border border-stone-200 dark:border-[#2a2d3e]",
                    )}>
                      <Icon className={cn("w-4 h-4", color)} />
                    </div>
                    <div>
                      <p className={cn("text-xs font-bold leading-tight", color)}>{label}</p>
                      <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5 leading-tight">
                        {desc}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom accent bar ── */}
      <div className="h-1 w-full bg-gradient-to-r from-[#1e2433] via-[#3a4a6a] to-[#1e2433] flex-shrink-0" />
    </div>
  );
}
