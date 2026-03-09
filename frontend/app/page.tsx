"use client";

import Link from "next/link";
import PostCard, { type PostCardProps } from "@/components/post-card";
import CategoryFilter from "@/components/category-filter";

const MOCK_LISTINGS: PostCardProps[] = [
  { id: "1", title: "Casio G-Shock GA-2100", price: 1800, type: "sale", location: "Calamba, Laguna", postedAt: "2h ago", imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80", seller: { name: "Juan dela Cruz", rating: 4.9 } },
  { id: "2", title: "Studio Unit — Makati CBD", price: 12000, priceUnit: "/ month", type: "rent", location: "Makati City", postedAt: "1d ago", imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80", seller: { name: "Maria Santos", rating: 4.7 } },
  { id: "3", title: "Aircon Cleaning & Repair", price: 500, priceUnit: "/ unit", type: "service", location: "San Pablo, Laguna", postedAt: "3h ago", imageUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80", seller: { name: "Pedro Reyes", rating: 5.0, isPro: true } },
  { id: "4", title: "MacBook Pro M2 2023", price: 68000, type: "sale", location: "Quezon City", postedAt: "5h ago", imageUrl: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80", seller: { name: "Ana Reyes", rating: 4.8 } },
  { id: "5", title: "Honda Click 125 Scooter", price: 600, priceUnit: "/ day", type: "rent", location: "Laguna", postedAt: "6h ago", imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80", seller: { name: "Carlos M.", rating: 4.6 } },
];
//Home page showcasing featured listings, category filter, and a grid of recent listings with a "Load more" button at the bottom.
export default function Home() {
  return (
    <>
      * <section className="bg-[#1e2433] px-4 sm:px-6 lg:px-8 py-10 fade-in">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>

            <h2 className="font-brand text-3xl sm:text-4xl text-stone-100 leading-tight max-w-lg">
              Buy, Sell & Rent —<br />
              <span className="italic font-normal text-stone-400">from people near you.</span>
            </h2>
            <div className="flex gap-3 mt-6">
              <a href="#listings" className="bg-stone-100 text-stone-800 text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-white transition-colors">Browse Listings</a>
              <Link href="/post/create" className="border border-stone-600 text-stone-300 text-sm font-medium px-5 py-2.5 rounded-full hover:border-stone-300 hover:text-white transition-colors">Post for Free</Link>
            </div>
          </div>
          <div className="flex gap-6 text-center shrink-0">
            {[
                { value: "Buy", label: "Find great deals" },
                { value: "Sell", label: "List for free" },
                { value: "Rent", label: "Short term use" },
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
      </section>

      <CategoryFilter totalCount={1248} />

      <main id="listings" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in delay-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 pt-28">
          {MOCK_LISTINGS.map((listing) => <PostCard key={listing.id} {...listing} />)}
        </div>
        <div className="flex justify-center mt-10">
          <button className="border border-stone-300 text-stone-600 text-sm font-medium px-8 py-3 rounded-full hover:bg-stone-200 transition-colors">
            Load more listings
          </button>
        </div>
      </main>
    </>
  );
}
