"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Star, MapPin, Clock } from "lucide-react";

export interface PostCardProps {
  id: string;
  title: string;
  price: number;
  priceUnit?: string;
  type: "sale" | "rent" | "service";
  category?: string;
  condition?: string;
  location: string;
  postedAt: string;
  imageUrl: string;
  seller: {
    name: string;
    rating: number;
    isPro?: boolean;
  };
}

const TYPE_CONFIG: Record<PostCardProps["type"], { label: string; cls: string }> = {
  sale:    { label: "FOR SALE",  cls: "bg-blue-600 text-white"    },
  rent:    { label: "FOR RENT",  cls: "bg-emerald-600 text-white" },
  service: { label: "SERVICE",   cls: "bg-violet-600 text-white"  },
};

export default function PostCard(props: PostCardProps) {
  const { id, title, price, priceUnit, type, category, location, postedAt, imageUrl, seller } = props;
  const [saved, setSaved] = useState(false);
  const cfg = TYPE_CONFIG[type];

  const formatPrice = (p: number) =>
    "₱" + p.toLocaleString("en-PH", { minimumFractionDigits: 0 });

  return (
    <article className="group relative flex flex-col bg-white dark:bg-[#1e2a3a] rounded-xl border border-stone-200 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">

      {/* Image */}
      <Link href={`/listing/${id}`} className="relative aspect-square overflow-hidden bg-stone-100 dark:bg-[#151f2e] shrink-0 block">
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <span className={`absolute top-2 left-2 text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded-md tracking-wider ${cfg.cls}`}>
          {cfg.label}
        </span>
        <button
          onClick={(e) => { e.preventDefault(); setSaved((v) => !v); }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-150 hover:scale-110"
          aria-label={saved ? "Remove bookmark" : "Bookmark listing"}
        >
          {saved
            ? <BookmarkCheck size={13} className="text-amber-600" fill="currentColor" />
            : <Bookmark size={13} className="text-stone-600 dark:text-stone-300" />
          }
        </button>
        {seller.isPro && (
          <span className="absolute bottom-2 left-2 text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-md">PRO</span>
        )}
      </Link>

      {/* Content */}
      <Link href={`/listing/${id}`} className="flex flex-col gap-1.5 p-2.5 sm:p-3 flex-1">
        {category && (
          <p className="text-[9px] sm:text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest leading-none">
            {category}
          </p>
        )}
        <h3 className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-100 line-clamp-2 leading-snug">
          {title}
        </h3>
        <p className="text-sm sm:text-base font-bold text-amber-700 dark:text-amber-500 leading-none mt-0.5">
          {formatPrice(price)}
          {priceUnit && <span className="text-[10px] font-normal text-stone-400 dark:text-stone-500 ml-1">{priceUnit}</span>}
        </p>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-stone-200 dark:bg-stone-600 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-stone-600 dark:text-stone-200 shrink-0 select-none">
            {seller.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 truncate leading-none">{seller.name}</span>
          <div className="ml-auto flex items-center gap-0.5 shrink-0">
            <Star size={9} className="text-amber-500" fill="currentColor" />
            <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400">{seller.rating.toFixed(1)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px] text-stone-400 dark:text-stone-500">
          <div className="flex items-center gap-0.5 min-w-0">
            <MapPin size={8} className="shrink-0" />
            <span className="truncate">{location}</span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Clock size={8} />
            <span>{postedAt}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
