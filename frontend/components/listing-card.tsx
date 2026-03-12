"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Eye,
  Heart,
  Star,
  Truck,
  Users,
  Clock,
  Tag,
} from "lucide-react";

export type ListingType = "SELL" | "RENT" | "SERVICE";
export type ItemCondition =
  | "NEW"
  | "LIKE_NEW"
  | "LIGHTLY_USED"
  | "WELL_USED"
  | "HEAVILY_USED";
export type DeliveryMethod = "MEETUP" | "SHIPPING";

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  listing_type: ListingType;
  condition: ItemCondition;
  delivery_method: DeliveryMethod;
  category: string;
  location_city: string;
  location_province: string;
  view_count: number;
  created_at: string;
  image_url: string;
  seller_name: string;
  seller_rating: number;
  seller_review_count: number;
  is_bookmarked?: boolean;
}

interface ListingCardProps {
  listing: Listing;
  onBookmark?: (id: string) => void;
}

const CONDITION_LABELS: Record<ItemCondition, string> = {
  NEW: "New",
  LIKE_NEW: "Like New",
  LIGHTLY_USED: "Lightly Used",
  WELL_USED: "Well Used",
  HEAVILY_USED: "Heavily Used",
};

const CONDITION_COLORS: Record<ItemCondition, string> = {
  NEW: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  LIKE_NEW: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  LIGHTLY_USED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  WELL_USED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  HEAVILY_USED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const TYPE_CONFIG: Record<
  ListingType,
  { label: string; color: string }
> = {
  SELL: {
    label: "For Sale",
    color: "bg-orange-500 text-white",
  },
  RENT: {
    label: "For Rent",
    color: "bg-violet-500 text-white",
  },
  SERVICE: {
    label: "Service",
    color: "bg-sky-500 text-white",
  },
};

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ListingCard({ listing, onBookmark }: ListingCardProps) {
  const [bookmarked, setBookmarked] = useState(listing.is_bookmarked ?? false);

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBookmarked((prev) => !prev);
    onBookmark?.(listing.id);
  };

  const typeConfig = TYPE_CONFIG[listing.listing_type];
  const conditionColor = CONDITION_COLORS[listing.condition];

  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md hover:border-orange-100 dark:hover:border-orange-900/40 transition-all duration-300 h-full flex flex-col">

        {/* Image Container */}
        <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
          <img
            src={listing.image_url}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />

          {/* Listing Type Badge */}
          <div
            className={`absolute top-2.5 left-2.5 px-2 py-1 rounded-lg text-[11px] font-bold tracking-wide ${typeConfig.color} shadow-sm`}
          >
            {typeConfig.label}
          </div>

          {/* Bookmark Button */}
          <button
            onClick={handleBookmark}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform duration-150"
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark listing"}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                bookmarked
                  ? "text-red-500 fill-red-500"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            />
          </button>

          {/* Delivery Method */}
          <div className="absolute bottom-2.5 left-2.5">
            <div className="flex items-center gap-1 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-full text-[10px] text-white font-medium">
              {listing.delivery_method === "SHIPPING" ? (
                <>
                  <Truck className="w-3 h-3" />
                  Shipping
                </>
              ) : (
                <>
                  <Users className="w-3 h-3" />
                  Meet Up
                </>
              )}
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-3.5 flex flex-col gap-2 flex-1">
          {/* Condition Badge */}
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${conditionColor}`}
            >
              {CONDITION_LABELS[listing.condition]}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
              <Clock className="w-3 h-3" />
              {timeAgo(listing.created_at)}
            </div>
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
            {listing.title}
          </h3>

          {/* Price */}
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
              ₱{listing.price.toLocaleString()}
            </span>
            {listing.listing_type === "RENT" && (
              <span className="text-xs text-gray-400 dark:text-gray-500">/day</span>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              {listing.location_city}, {listing.location_province}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 dark:border-gray-800 mt-auto pt-2.5">
            <div className="flex items-center justify-between">
              {/* Seller Info */}
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-orange-600 dark:text-orange-400">
                    {listing.seller_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 truncate font-medium">
                  {listing.seller_name}
                </span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <div className="flex items-center gap-0.5 text-[11px] text-amber-500">
                  <Star className="w-3 h-3 fill-amber-400" />
                  <span className="font-medium">
                    {listing.seller_rating.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                  <Eye className="w-3 h-3" />
                  <span>{listing.view_count}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
