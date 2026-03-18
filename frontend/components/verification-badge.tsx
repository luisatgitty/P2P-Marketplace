import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export type VerificationBadgeState = "unverified" | "pending" | "verified" | "rejected";

interface VerificationBadgeProps {
  state?: VerificationBadgeState;
  status?: string;
  verified?: boolean;
  className?: string;
}

function resolveVerificationBadgeState({
  state,
  status,
  verified,
}: Pick<VerificationBadgeProps, "state" | "status" | "verified">): VerificationBadgeState {
  if (state) return state;

  if (typeof verified === "boolean") {
    return verified ? "verified" : "unverified";
  }

  const normalized = (status ?? "").toLowerCase().trim();
  if (normalized === "verified") return "verified";
  if (normalized === "pending") return "pending";
  if (normalized === "rejected") return "rejected";
  return "unverified";
}

export default function VerificationBadge({ state, status, verified, className }: VerificationBadgeProps) {
  const resolvedState = resolveVerificationBadgeState({ state, status, verified });

  const styleMap: Record<VerificationBadgeState, { label: string; tone: string }> = {
    verified: {
      label: "Verified",
      tone: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700",
    },
    pending: {
      label: "Pending",
      tone: "bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700",
    },
    rejected: {
      label: "Rejected",
      tone: "bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700",
    },
    unverified: {
      label: "Unverified",
      tone: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    },
  };

  const badge = styleMap[resolvedState];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border",
        badge.tone,
        className,
      )}
    >
      <ShieldCheck className="w-3 h-3" />
      {badge.label}
    </span>
  );
}
