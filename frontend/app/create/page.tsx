"use client";

import Link from "next/link";
import { Tag, Home, Wrench, ChevronRight, ShieldCheck, Zap, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/utils/UserContext";

const TYPES = [
  {
    slug: "sell",
    icon: Tag,
    label: "Sell an Item",
    subtitle: "List a physical item for sale",
    description:
      "Got something you no longer need? List it here and connect with buyers nearby. Works for gadgets, clothing, furniture, vehicles, and more.",
    examples: ["Electronics", "Clothing & Shoes", "Vehicles", "Furniture", "Collectibles"],
    accentFrom: "#1d4ed8",
    accentTo:   "#2563eb",
    badgeCls:   "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300",
    borderHover:"hover:border-blue-400 dark:hover:border-blue-500",
    ringFocus:  "focus-visible:ring-blue-400",
    iconBg:     "bg-blue-600",
    arrowCls:   "text-blue-500",
  },
  {
    slug: "rent",
    icon: Home,
    label: "Rent Out Something",
    subtitle: "List a property or item for rent",
    description:
      "Earn from what you own. Rent out real estate, vehicles, equipment, or event items to people who need them short-term.",
    examples: ["Rooms & Apartments", "Houses & Condos", "Event Equipment", "Vehicles", "Commercial Spaces"],
    accentFrom: "#059669",
    accentTo:   "#10b981",
    badgeCls:   "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
    borderHover:"hover:border-emerald-400 dark:hover:border-emerald-500",
    ringFocus:  "focus-visible:ring-emerald-400",
    iconBg:     "bg-emerald-600",
    arrowCls:   "text-emerald-500",
  },
  {
    slug: "service",
    icon: Wrench,
    label: "Offer a Service",
    subtitle: "Advertise your skills or expertise",
    description:
      "Share your professional skills with your community. From home repairs to digital services — list what you do and let clients come to you.",
    examples: ["Home Repair & Cleaning", "IT & Tech Services", "Tutoring", "Photography", "Catering"],
    accentFrom: "#7c3aed",
    accentTo:   "#8b5cf6",
    badgeCls:   "bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300",
    borderHover:"hover:border-violet-400 dark:hover:border-violet-500",
    ringFocus:  "focus-visible:ring-violet-400",
    iconBg:     "bg-violet-600",
    arrowCls:   "text-violet-500",
  },
] as const;

const TRUST_ITEMS = [
  { icon: Zap,        text: "Free to list — always"            },
  { icon: ShieldCheck,text: "Verified seller badge available"  },
  { icon: Users,      text: "Reach thousands of local buyers"  },
];

export default function CreateListingPage() {
  const { isAuth } = useUser();
  
  // Don't render anything until auth check is complete
  if (!isAuth) return null;

  return (
    <div className="min-h-fit bg-stone-50 dark:bg-[#111827]">

      {/* ── Header band ──────────────────────────────────────────────────────── */}
      <div className="bg-[#1a2235] border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-2">
            Post a Listing
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
            What are you listing today?
          </h1>
          <p className="text-stone-400 text-sm mt-2">
            Choose the listing type that best fits what you want to offer.
          </p>
        </div>
      </div>

      {/* ── Cards ────────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TYPES.map((t) => (
            <Link
              key={t.slug}
              href={`/create/${t.slug}`}
              className={cn(
                "group relative flex flex-col rounded-2xl border-2 border-stone-200 dark:border-white/10",
                "bg-white dark:bg-[#1e2a3a] p-5 sm:p-6",
                "transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
                t.borderHover,
                t.ringFocus,
                "focus-visible:outline-none focus-visible:ring-2"
              )}
            >
              {/* Icon */}
              <div className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center mb-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                t.iconBg
              )}>
                <t.icon size={20} className="text-white" />
              </div>

              {/* Label */}
              <h2 className="text-base font-bold text-stone-800 dark:text-stone-100 leading-tight">
                {t.label}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 mb-3">
                {t.subtitle}
              </p>

              {/* Description */}
              <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed flex-1">
                {t.description}
              </p>

              {/* CTA row */}
              <div className={cn(
                "flex items-center gap-1 mt-2 text-sm font-semibold transition-colors",
                t.arrowCls
              )}>
                Get started
                <ChevronRight size={15} className="transition-transform duration-150 group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom note */}
        <p className="text-center text-xs text-stone-400 dark:text-stone-500 mt-8">
          By posting a listing, you agree to our{" "}
          <Link href="#" className="underline underline-offset-2 hover:text-stone-600">Terms of Service</Link>{" "}
          and{" "}
          <Link href="#" className="underline underline-offset-2 hover:text-stone-600">Community Guidelines</Link>.
        </p>
      </div>
    </div>
  );
}
