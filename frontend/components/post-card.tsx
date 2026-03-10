"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export type ListingType = "sale" | "rent" | "service";

export interface PostCardProps {
  id: string;
  title: string;
  price: number;
  priceUnit?: string;
  type: ListingType;
  category?: string;
  location: string;
  postedAt: string;
  imageUrl: string;
  seller: {
    name: string;
    rating?: number;
    avatarUrl?: string;
    isPro?: boolean;
  };
  isSaved?: boolean;
}

const badgeConfig = {
  sale:    { label: "For Sale",  className: "bg-stone-800 text-stone-100",  avatarBg: "bg-stone-200",  avatarText: "text-stone-500"  },
  rent:    { label: "For Rent",  className: "bg-teal-700 text-white",       avatarBg: "bg-teal-100",   avatarText: "text-teal-600"   },
  service: { label: "Service",   className: "bg-violet-700 text-white",     avatarBg: "bg-violet-100", avatarText: "text-violet-600" },
};

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg className="w-4 h-4" fill={filled ? "#f43f5e" : "none"} stroke={filled ? "#f43f5e" : "currentColor"} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4.318 6.318a4.5 4.5 0 0 1 6.364 0L12 7.636l1.318-1.318a4.5 4.5 0 0 1 6.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 0 1 0-6.364z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4z" />
  </svg>
);

export default function PostCard({ id, title, price, priceUnit, type, location, postedAt, imageUrl, seller, isSaved = false }: PostCardProps) {
  const [saved, setSaved] = useState(isSaved);
  const badge = badgeConfig[type];

  const formattedPrice = new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP", minimumFractionDigits: 0,
  }).format(price);

  return (
    <Link href={`/listing/${id}`} className="block">
      <div className="card-hover bg-white rounded-2xl overflow-hidden border border-stone-200 cursor-pointer group">
        <div className="card-img relative overflow-hidden aspect-4/3 bg-stone-100">
          <Image src={imageUrl} alt={title} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover transition-transform duration-300" />
          <span className={`absolute top-2 left-2 text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
          {seller.isPro && <span className="absolute bottom-2 left-2 bg-amber-400 text-amber-900 text-xs font-semibold px-2 py-0.5 rounded-full">PRO</span>}
          <button onClick={(e) => { e.preventDefault(); setSaved(p => !p); }}
            className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm text-stone-400 hover:scale-110 transition-transform">
            <HeartIcon filled={saved} />
          </button>
        </div>
        <div className="p-3">
          <p className="text-stone-800 font-semibold text-sm leading-tight truncate">{title}</p>
          <div className="flex items-baseline gap-1 mt-0.5">
            <p className="text-stone-800 font-bold text-base">{formattedPrice}</p>
            {priceUnit && <span className="text-xs text-stone-400">{priceUnit}</span>}
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-stone-400 truncate max-w-[65%]">{location}</span>
            <span className="text-xs text-stone-400">{postedAt}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-stone-100">
            <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center ${badge.avatarBg} ${badge.avatarText}`}>
              <UserIcon />
            </div>
            <span className="text-xs text-stone-500 truncate">{seller.name}</span>
            {seller.rating && <span className="ml-auto text-xs text-amber-500 font-medium">★ {seller.rating.toFixed(1)}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-stone-200 animate-pulse">
      <div className="aspect-4/3 bg-stone-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-stone-200 rounded-full w-3/4" />
        <div className="h-4 bg-stone-200 rounded-full w-1/3" />
        <div className="h-3 bg-stone-200 rounded-full w-1/2" />
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-100">
          <div className="w-5 h-5 rounded-full bg-stone-200" />
          <div className="h-3 bg-stone-200 rounded-full w-24" />
        </div>
      </div>
    </div>
  );
}