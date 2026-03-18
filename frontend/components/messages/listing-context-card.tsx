


import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { ConversationListing } from "@/types/messaging";

interface ListingContextCardProps {
  listing: ConversationListing;
}

export default function ListingContextCard({ listing }: ListingContextCardProps) {
  const fmt = (n: number) =>
    "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 0 });

  return (
    <div className="mx-3 my-2 flex items-center gap-3 px-2 py-2 rounded-xl bg-stone-50 dark:bg-[#13151f] border border-border shrink-0">
      {/* Listing primary image */}
      <Link
        href={`/listing/${listing.id}`}
        className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-border bg-stone-100 dark:bg-[#0f1117]"
        title="View listing"
      >
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-base">📦</div>
        )}
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-stone-800 dark:text-stone-100 truncate leading-tight">
          {listing.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs font-bold text-amber-700 dark:text-amber-500">
            {fmt(listing.price)} {listing.priceUnit ?? ""}
          </span>
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
