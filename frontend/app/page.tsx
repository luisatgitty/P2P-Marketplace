"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PostCard, { type PostCardProps } from "@/components/post-card";
import CategoryFilter from "@/components/category-filter";
import LocationFilter from "@/components/location-filter";
import { useUser } from "@/utils/UserContext";
import * as listingService from "@/services/listingService";

const MOCK_LISTINGS: PostCardProps[] = [
  {
    id: "1",
    title: "Casio G-Shock GA-2100",
    price: 1800,
    type: "sale",
    category: "electronics",
    location: "Calamba, Laguna",
    postedAt: "2h ago",
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80",
    seller: { name: "Juan dela Cruz", rating: 4.9 },
  },
  {
    id: "2",
    title: "Studio Unit — Makati CBD",
    price: 12000,
    priceUnit: "/ month",
    type: "rent",
    category: "real-estate",
    location: "Makati City",
    postedAt: "1d ago",
    imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80",
    seller: { name: "Maria Santos", rating: 4.7 },
  },
  {
    id: "3",
    title: "Aircon Cleaning & Repair",
    price: 500,
    priceUnit: "/ unit",
    type: "service",
    category: "services",
    location: "San Pablo, Laguna",
    postedAt: "3h ago",
    imageUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80",
    seller: { name: "Pedro Reyes", rating: 5.0, isPro: true },
  },
  {
    id: "4",
    title: "MacBook Pro M2 2023",
    price: 68000,
    type: "sale",
    category: "electronics",
    location: "Quezon City",
    postedAt: "5h ago",
    imageUrl: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80",
    seller: { name: "Ana Reyes", rating: 4.8 },
  },
  {
    id: "5",
    title: "Honda Click 125 Scooter",
    price: 600,
    priceUnit: "/ day",
    type: "rent",
    category: "vehicles",
    location: "Laguna",
    postedAt: "6h ago",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
    seller: { name: "Carlos M.", rating: 4.6 },
  },
];

// ── Post for Free — seller-aware ─────────────────────────────────────────────
function PostForFreeButton() {
  const { user, isValidated } = useUser();
  const router = useRouter();
  const isSeller = user?.status === "verified";

  function handleClick() {
    if (!isValidated) { router.push("/login"); return; }
    if (!isSeller)    { router.push("/profile"); return; }
    router.push("/create");
  }

  return (
    <button
      onClick={handleClick}
      className="border border-stone-600 text-stone-300 text-sm font-medium px-5 py-2.5 rounded-full hover:border-stone-300 hover:text-white transition-colors flex items-center gap-2"
    >
      {isSeller ? "✨ Post for Free" : isValidated ? "🏪 Become a Seller" : "Post for Free"}
    </button>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [listings, setListings] = useState<PostCardProps[]>(MOCK_LISTINGS);
  const [locFilter, setLocFilter] = useState<string>("");
  const [tabFilter, setTabFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    const saved = listingService.getListings();
    if (saved.length) {
      const existingIds = new Set(MOCK_LISTINGS.map((l) => l.id));
      const newOnes = saved.filter((l) => !existingIds.has(l.id));
      if (newOnes.length) setListings((prev) => [...prev, ...newOnes]);
    }
  }, []);

  const filtered = listings.filter((l) => {
    if (locFilter && !l.location.toLowerCase().includes(locFilter.toLowerCase())) return false;
    if (tabFilter !== "all" && l.type !== tabFilter) return false;
    if (categoryFilter !== "all" && l.category !== categoryFilter) return false;
    return true;
  });

  return (
    <>
      {/* ── Hero ── */}
      <section className="bg-[#1e2433] px-4 sm:px-6 lg:px-8 py-10 fade-in">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="font-brand text-3xl sm:text-4xl text-stone-100 leading-tight max-w-lg">
                Buy, Sell &amp; Rent —<br />
                <span className="italic font-normal text-stone-400">from people near you.</span>
              </h2>
              <div className="flex gap-3 mt-6 flex-wrap">
                <a
                  href="#listings"
                  className="bg-stone-100 text-stone-800 text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-white transition-colors"
                >
                  Browse Listings
                </a>
                <PostForFreeButton />
              </div>
            </div>

            <div className="flex gap-6 text-center shrink-0">
              {[
                { value: "Buy",  label: "Find great deals" },
                { value: "Sell", label: "List for free"    },
                { value: "Rent", label: "Short term use"   },
              ].map((stat, i) => (
                <div key={stat.label} className="flex items-center gap-8">
                  {i > 0 && <div className="w-px h-20 bg-stone-700" />}
                  <div>
                    <p className="font-brand text-2xl text-stone-100 font-semibold">{stat.value}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CategoryFilter
        totalCount={filtered.length}
        onTabChange={(tab) => setTabFilter(tab)}
        onCategoryChange={(cat) => setCategoryFilter(cat)}
      />
      <LocationFilter onLocationChange={setLocFilter} />

      {/* ── Listings grid ── */}
      <main
        id="listings"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in delay-2"
      >
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 pt-28">
            {filtered.map((listing) => (
              <PostCard key={listing.id} {...listing} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 pt-40">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-stone-500 font-medium">No listings found for these filters.</p>
            <p className="text-stone-400 text-sm mt-1">Try a different location or category.</p>
          </div>
        )}
        <div className="flex justify-center mt-10">
          <button className="border border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-400 text-sm font-medium px-8 py-3 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors">
            Load more listings
          </button>
        </div>
      </main>
    </>
  );
}