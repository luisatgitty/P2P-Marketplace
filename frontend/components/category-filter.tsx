"use client";

import { useState } from "react";

export type ListingTab = "all" | "sale" | "rent" | "service";

interface CategoryFilterProps {
  onTabChange?: (tab: ListingTab) => void;
  onCategoryChange?: (cat: string) => void;
  onSortChange?: (sort: string) => void;
  totalCount?: number;
}

const TABS = [
  { label: "All",      value: "all"     },
  { label: "For Sale", value: "sale"    },
  { label: "For Rent", value: "rent"    },
  { label: "Services", value: "service" },
] as const;

const CATEGORIES = [
  { emoji: "🏷️", label: "All Categories", value: "all"         },
  { emoji: "📱", label: "Electronics",    value: "electronics" },
  { emoji: "🏠", label: "Real Estate",    value: "real-estate" },
  { emoji: "🚗", label: "Vehicles",       value: "vehicles"    },
  { emoji: "👗", label: "Clothing",       value: "clothing"    },
  { emoji: "🛋️", label: "Furniture",      value: "furniture"   },
  { emoji: "🔧", label: "Services",       value: "services"    },
  { emoji: "📚", label: "Books",          value: "books"       },
  { emoji: "⚽", label: "Sports",         value: "sports"      },
];

const SORT_OPTIONS = [
  { label: "Newest",             value: "newest"     },
  { label: "Price: Low to High", value: "price_asc"  },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Most Popular",       value: "popular"    },
  { label: "Near Me",            value: "near"       },
];

export default function CategoryFilter({ onTabChange, onCategoryChange, onSortChange, totalCount = 0 }: CategoryFilterProps) {
  const [activeTab, setActiveTab]           = useState<ListingTab>("all");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeSort, setActiveSort]         = useState("newest");

  return (
    <div className="bg-stone-50 border-b border-stone-200 sticky top-26.25 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex gap-8 border-b border-stone-100 overflow-x-auto no-scroll">
          {TABS.map((tab) => (
            <button key={tab.value}
              onClick={() => { setActiveTab(tab.value); onTabChange?.(tab.value); }}
              className={`text-base font-medium py-4 whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.value ? "border-stone-800 text-stone-800" : "border-transparent text-stone-500 hover:text-stone-700"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between py-4 gap-4">
          <div className="flex gap-3 overflow-x-auto no-scroll flex-1">
            {CATEGORIES.map((cat) => (
              <button key={cat.value}
                onClick={() => { setActiveCategory(cat.value); onCategoryChange?.(cat.value); }}
                className={`shrink-0 border rounded-full px-5 py-2 text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.value
                    ? "bg-stone-800 text-stone-100 border-stone-800"
                    : "border-stone-200 text-stone-600 hover:bg-stone-800 hover:text-stone-100 hover:border-stone-800"
                }`}>
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {totalCount > 0 && (
              <p className="text-base text-stone-500 hidden sm:block">
                <span className="font-semibold text-stone-700">{totalCount.toLocaleString()}</span> listings
              </p>
            )}
            <select value={activeSort} onChange={(e) => { setActiveSort(e.target.value); onSortChange?.(e.target.value); }}
              className="bg-transparent border border-stone-200 rounded-full text-sm text-stone-600 px-4 py-2 cursor-pointer outline-none hover:border-stone-400 transition-colors appearance-none">
              {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}