import { cn } from "@/lib/utils";
import type { ListingType } from "@/types/messaging";

// Colors mirror post-card.tsx: sell=blue-600, rent=emerald-600, service=violet-600
const TYPE_CONFIG: Record<ListingType, { label: string; cls: string }> = {
  SELL:    { label: "For Sale",  cls: "bg-blue-100    dark:bg-blue-900/30    text-blue-700    dark:text-blue-400"    },
  RENT:    { label: "For Rent",  cls: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
  SERVICE: { label: "Service",   cls: "bg-violet-100  dark:bg-violet-900/30  text-violet-700  dark:text-violet-400"  },
};

interface ListingTypeBadgeProps {
  type: ListingType;
  className?: string;
}

export default function ListingTypeBadge({ type, className }: ListingTypeBadgeProps) {
  const config = TYPE_CONFIG[type] ?? {
    label: type ?? "Unknown",
    cls: "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400",
  };
  const { label, cls } = config;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded",
        cls,
        className
      )}
    >
      {label}
    </span>
  );
}
