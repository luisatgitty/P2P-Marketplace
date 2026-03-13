


import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { ConversationListing } from "@/types/messaging";
import ListingTypeBadge from "./listing-type-badge";

interface ListingContextCardProps {
  listing: ConversationListing;
}

const TYPE_ICON: Record<string, string> = {
  SELL:    "🏷️",
  RENT:    "🔑",
  SERVICE: "🔧",
};

export default function ListingContextCard({ listing }: ListingContextCardProps) {
  const fmt = (n: number) =>
    "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 0 });

  return (
    <div className="mx-3 my-2 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-stone-50 dark:bg-[#13151f] border border-border shrink-0">
      {/* Icon */}
      <div className="w-9 h-9 rounded-lg bg-amber-700/10 dark:bg-amber-700/20 flex items-center justify-center text-xl shrink-0 select-none">
        {TYPE_ICON[listing.listingType] ?? "📦"}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-stone-800 dark:text-stone-100 truncate leading-tight">
          {listing.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs font-bold text-amber-700 dark:text-amber-500">
            {fmt(listing.price)}{listing.priceUnit ?? ""}
          </span>
          <ListingTypeBadge type={listing.listingType} />
        </div>
      </div>

      {/* View link */}
      <Link
        href={`/listing/${listing.id}`}
        className="p-1.5 rounded-md text-stone-400 dark:text-stone-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors shrink-0"
        title="View listing"
      >
        <ExternalLink size={14} />
      </Link>
    </div>
  );
}
