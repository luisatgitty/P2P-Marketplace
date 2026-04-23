import { cn } from "@/lib/utils";
import type { ListingType } from "@/types/messaging";

type LowerListingType = "sell" | "rent" | "service";

type BadgeVariant = "soft" | "solid";

const TYPE_CONFIG: Record<"SELL" | "RENT" | "SERVICE", { label: string; softClass: string; solidClass: string }> = {
  SELL: {
    label: "For Sale",
    softClass: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
    solidClass: "bg-orange-400 text-white",
  },
  RENT: {
    label: "For Rent",
    softClass: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    solidClass: "bg-emerald-600 text-white",
  },
  SERVICE: {
    label: "Service",
    softClass: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
    solidClass: "bg-violet-600 text-white",
  },
};

const TYPE_ALIASES: Record<string, "SELL" | "RENT" | "SERVICE"> = {
  SELL: "SELL",
  SALE: "SELL",
  FORSALE: "SELL",
  FOR_SALE: "SELL",
  RENT: "RENT",
  RENTAL: "RENT",
  FORRENT: "RENT",
  FOR_RENT: "RENT",
  SERVICE: "SERVICE",
  SERVICES: "SERVICE",
};

function normalizeListingType(type: ListingType | LowerListingType | string | null | undefined): "SELL" | "RENT" | "SERVICE" | "" {
  const normalized = String(type ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "_");

  const mapped = TYPE_ALIASES[normalized];
  if (mapped) {
    return mapped;
  }

  if (normalized === "SELL" || normalized === "RENT" || normalized === "SERVICE") {
    return normalized;
  }
  return "";
}

function isSoldStatus(value?: string): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "sold";
}

interface ListingTypeBadgeProps {
  type: ListingType | LowerListingType | string | null | undefined;
  status?: string;
  sellStatus?: string;
  variant?: BadgeVariant;
  className?: string;
  soldClassName?: string;
  showSoldBadge?: boolean;
  soldLabel?: string;
  hideTypeWhenSold?: boolean;
}

export default function ListingTypeBadge({
  type,
  status,
  sellStatus,
  variant = "soft",
  className,
  soldClassName,
  showSoldBadge = true,
  soldLabel = "Sold",
  hideTypeWhenSold = true,
}: ListingTypeBadgeProps) {
  const normalizedType = normalizeListingType(type);
  const config = normalizedType ? TYPE_CONFIG[normalizedType] : null;

  const typeLabel = config?.label ?? (String(type ?? "").trim() || "Unknown");
  const typeColorClass = config
    ? (variant === "solid" ? config.solidClass : config.softClass)
    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400";

  const shouldShowSold =
    showSoldBadge &&
    normalizedType === "SELL" &&
    (isSoldStatus(status) || isSoldStatus(sellStatus));

  if (shouldShowSold && hideTypeWhenSold) {
    return (
      <span
        className={cn(
          "inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
          soldClassName
        )}
      >
        {soldLabel}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded",
          typeColorClass,
          className
        )}
      >
        {typeLabel}
      </span>
      {shouldShowSold && (
        <span
          className={cn(
            "inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
            soldClassName
          )}
        >
          {soldLabel}
        </span>
      )}
    </span>
  );
}
