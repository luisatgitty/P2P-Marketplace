"use client";

import Link from "next/link";
import { MapPin, Clock } from "lucide-react";
import ListingTypeBadge from "@/components/listing-type-badge";
import { ImageLink } from "@/components/image-link";
import { formatPrice, formatTimeAgo } from "@/utils/string-builder"; 

export interface PostCardProps {
  id: string;
  title: string;
  price: number;
  priceUnit?: string;
  type: "sell" | "rent" | "service";
  status?: string;
  sellStatus?: string;
  category?: string;
  condition?: string;
  location: string;
  postedAt: string;
  imageUrl: string;
  seller: {
    id?: string;
    name: string;
    profileImageUrl?: string;
    rating: number;
    isPro?: boolean;
    isActive?: boolean;
  };
}

export default function PostCard(props: PostCardProps) {
  const { id, title, price, priceUnit, type, status, sellStatus, location, postedAt, imageUrl } = props;
  return (
    <article className="group relative flex flex-col bg-white dark:bg-[#1e2a3a] rounded-lg border border-stone-200 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">

      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-stone-100 dark:bg-[#151f2e] shrink-0 block">
        <ImageLink
          href={`/listing/${id}`}
          src={imageUrl}
          type="card"
          label={title}
          className="w-full h-full"
        />
        <div className="absolute top-1 left-2">
          <ListingTypeBadge
            type={type}
            status={status}
            sellStatus={sellStatus}
            variant="solid"
            className="text-[9px] sm:text-[10px] font-extrabold rounded-sm"
            soldClassName="text-[9px] sm:text-[10px] font-extrabold rounded-sm"
          />
        </div>
      </div>

      {/* Content */}
      <Link href={`/listing/${id}`} className="flex flex-col gap-1 p-2.5 sm:p-3 flex-1">
        <h3 className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-100 line-clamp-2 leading-snug">
          {title}
        </h3>
        <p className="text-sm sm:text-base font-bold text-amber-700 dark:text-amber-500 leading-none mt-0.5">
          {formatPrice(price)}
          {priceUnit && <span className="text-[11px] font-normal text-black dark:text-white ml-1">{priceUnit}</span>}
        </p>
        <div className="flex-1" />
        <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] text-stone-400 dark:text-stone-500">
          <div className="flex items-center gap-0.5 min-w-0">
            <MapPin size={11} className="shrink-0" />
            <span className="text-[10px] md:text-[11px] truncate">{location}</span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Clock size={11} />
            <span className="text-[10px] md:text-[11px]">{formatTimeAgo(postedAt)}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
