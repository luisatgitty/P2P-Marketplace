"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import PostCard, { type PostCardProps } from "@/components/post-card";
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Mock data ─────────────────────────────────────────────────────────────────
const ALL_LISTINGS: (PostCardProps & { category: string; condition: string; createdAt: number })[] = [
  { id: "1",  title: "Casio G-Shock GA-2100 'CasiOak'",          price: 4800,  type: "sell",    category: "Electronics",     condition: "Like New",     location: "Calamba, Laguna",   postedAt: "2h ago",  imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80", seller: { name: "Juan dela Cruz",  rating: 4.9 }, createdAt: Date.now() - 7200000 },
  { id: "2",  title: "Studio Unit — Makati CBD (Fully Furnished)", price: 22000, type: "rent",    category: "Real Estate",     condition: "New",          location: "Makati City",       postedAt: "1d ago",  priceUnit: "/ mo", imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80", seller: { name: "Maria Santos",    rating: 4.7 }, createdAt: Date.now() - 86400000 },
  { id: "3",  title: "Aircon Deep Cleaning & Repair Service",     price: 500,   type: "service", category: "Home Services",   condition: "New",          location: "San Pablo, Laguna", postedAt: "3h ago",  priceUnit: "/ unit", imageUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80", seller: { name: "Pedro Reyes",     rating: 5.0, isPro: true }, createdAt: Date.now() - 10800000 },
  { id: "4",  title: "MacBook Pro M2 2023 — Space Gray 16\"",     price: 68000, type: "sell",    category: "Electronics",     condition: "Like New",     location: "Quezon City",       postedAt: "5h ago",  imageUrl: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80", seller: { name: "Ana Reyes",       rating: 4.8 }, createdAt: Date.now() - 18000000 },
  { id: "5",  title: "Honda Click 125 Scooter Daily Rental",      price: 600,   type: "rent",    category: "Vehicles",        condition: "Well Used",    location: "Santa Rosa, Laguna",postedAt: "6h ago",  priceUnit: "/ day", imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80", seller: { name: "Carlos M.",       rating: 4.6 }, createdAt: Date.now() - 21600000 },
  { id: "6",  title: "Sony WH-1000XM5 Noise Cancelling Headphones",price: 12500, type: "sell",   category: "Electronics",     condition: "Like New",     location: "Pasig City",        postedAt: "1h ago",  imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80", seller: { name: "Leo Fernandez",   rating: 4.7 }, createdAt: Date.now() - 3600000 },
  { id: "7",  title: "Professional Web Development Services",     price: 8000,  type: "service", category: "IT & Digital",    condition: "New",          location: "Remote / Metro Manila", postedAt: "2d ago", priceUnit: "/ project", imageUrl: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&q=80", seller: { name: "Dev Studio PH",   rating: 5.0, isPro: true }, createdAt: Date.now() - 172800000 },
  { id: "8",  title: "IKEA KALLAX Shelf Unit 4×4 (Walnut Effect)", price: 3200,  type: "sell",   category: "Home & Living",   condition: "Lightly Used", location: "Taguig, Metro Manila", postedAt: "4h ago", imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80", seller: { name: "Grace Tan",       rating: 4.5 }, createdAt: Date.now() - 14400000 },
  { id: "9",  title: "Canon EOS R50 Mirrorless Camera + 18-45mm", price: 41000, type: "sell",    category: "Electronics",     condition: "Like New",     location: "Cebu City",          postedAt: "8h ago", imageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80", seller: { name: "Mike Lim",        rating: 4.9 }, createdAt: Date.now() - 28800000 },
  { id: "10", title: "2BR House & Lot for Rent — Cavite",         price: 18000, type: "rent",    category: "Real Estate",     condition: "New",          location: "Imus, Cavite",       postedAt: "3d ago",  priceUnit: "/ mo", imageUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80", seller: { name: "Alma Cruz",       rating: 4.6 }, createdAt: Date.now() - 259200000 },
  { id: "11", title: "Levi's 511 Slim Fit Jeans — W32 L30",       price: 950,   type: "sell",    category: "Clothing",        condition: "Lightly Used", location: "Antipolo, Rizal",    postedAt: "12h ago", imageUrl: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80", seller: { name: "Tricia V.",       rating: 4.4 }, createdAt: Date.now() - 43200000 },
  { id: "12", title: "Massage & Relaxation Therapy (Home Service)", price: 650,  type: "service", category: "Health & Wellness", condition: "New",         location: "Paranaque City",    postedAt: "5h ago",  priceUnit: "/ session", imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&q=80", seller: { name: "Wellness by Riza", rating: 4.8, isPro: true }, createdAt: Date.now() - 18000000 },
  { id: "13", title: "Mountain Bike Trek Marlin 7 — 2022",         price: 28000, type: "sell",   category: "Sports & Outdoors", condition: "Well Used",   location: "Baguio City",       postedAt: "1d ago",  imageUrl: "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=400&q=80", seller: { name: "Jared Ong",       rating: 4.7 }, createdAt: Date.now() - 86400000 },
  { id: "14", title: "Toyota Vios 1.3 E MT 2019 — Excellent Cond", price: 590000, type: "sell",  category: "Vehicles",        condition: "Well Used",    location: "Batangas City",     postedAt: "2d ago",  imageUrl: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&q=80", seller: { name: "Rico Almonte",    rating: 4.9 }, createdAt: Date.now() - 172800000 },
  { id: "15", title: "Event Sound System Rental (Full Setup)",      price: 4500,  type: "rent",   category: "Events",          condition: "Like New",     location: "Laguna / Batangas", postedAt: "6h ago",  priceUnit: "/ event", imageUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&q=80", seller: { name: "SoundPro Events", rating: 4.8, isPro: true }, createdAt: Date.now() - 21600000 },
  { id: "16", title: "Nike Air Force 1 '07 White — US9",           price: 3800,  type: "sell",   category: "Clothing",        condition: "New",          location: "Davao City",        postedAt: "9h ago",  imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80", seller: { name: "Kyla Delos Reyes",rating: 4.6 }, createdAt: Date.now() - 32400000 },
  { id: "17", title: "Home Tutoring — Math, Science, English K-12", price: 350,  type: "service", category: "Education",       condition: "New",          location: "Quezon City",       postedAt: "1d ago",  priceUnit: "/ hr", imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=80", seller: { name: "Ms. Patricia U.", rating: 5.0, isPro: true }, createdAt: Date.now() - 86400000 },
  { id: "18", title: "iPad Pro 11\" M2 (2022) WiFi 256GB",          price: 42000, type: "sell",   category: "Electronics",     condition: "Like New",     location: "Mandaluyong City",  postedAt: "7h ago",  imageUrl: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&q=80", seller: { name: "Ben Torres",      rating: 4.8 }, createdAt: Date.now() - 25200000 },
  { id: "19", title: "Commercial Space for Rent — Ground Floor",    price: 35000, type: "rent",   category: "Real Estate",     condition: "New",          location: "Lipa City, Batangas", postedAt: "3d ago", priceUnit: "/ mo", imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80", seller: { name: "Realty Plus PH",  rating: 4.5, isPro: true }, createdAt: Date.now() - 259200000 },
  { id: "20", title: "Photo & Video Coverage — Weddings & Events",  price: 15000, type: "service", category: "Creative",       condition: "New",          location: "Nationwide / Travel", postedAt: "4d ago", priceUnit: "/ package", imageUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&q=80", seller: { name: "Luz Photoworks",  rating: 5.0, isPro: true }, createdAt: Date.now() - 345600000 },
  { id: "21", title: "Herman Miller Aeron Chair (Size B, Remastered)", price: 55000, type: "sell", category: "Home & Living",  condition: "Lightly Used", location: "Bgry. Kapitolyo, Pasig", postedAt: "2d ago", imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80", seller: { name: "Office Depot PH", rating: 4.7, isPro: true }, createdAt: Date.now() - 172800000 },
  { id: "22", title: "Nikon Z30 Creator Kit — Vlogging Bundle",     price: 39500, type: "sell",   category: "Electronics",     condition: "New",          location: "Manila City",       postedAt: "11h ago", imageUrl: "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&q=80", seller: { name: "CameraShop MNL",  rating: 4.6 }, createdAt: Date.now() - 39600000 },
  { id: "23", title: "Catering Services — 50 to 500 Pax",           price: 350,   type: "service", category: "Food & Events",  condition: "New",          location: "Metro Manila",      postedAt: "5d ago",  priceUnit: "/ pax", imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80", seller: { name: "Kusina ni Luz",   rating: 4.9, isPro: true }, createdAt: Date.now() - 432000000 },
  { id: "24", title: "Folding Camping Tent (4-Person, Waterproof)",  price: 2800,  type: "sell",   category: "Sports & Outdoors", condition: "Lightly Used", location: "Bulacan",          postedAt: "3h ago",  imageUrl: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&q=80", seller: { name: "Outdoors Fanatic", rating: 4.5 }, createdAt: Date.now() - 10800000 },
  { id: "25", title: "Acoustic Guitar Yamaha F310 + Soft Case",     price: 3500,  type: "sell",   category: "Hobbies",         condition: "Well Used",    location: "Cebu City",         postedAt: "1d ago",  imageUrl: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&q=80", seller: { name: "Music Hub PH",    rating: 4.8 }, createdAt: Date.now() - 86400000 },
  { id: "26", title: "Refrigerator Inverter 2-Door 520L",            price: 28500, type: "sell",   category: "Home & Living",   condition: "Like New",     location: "Valenzuela City",   postedAt: "6h ago",  imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80", seller: { name: "Home Appliances+", rating: 4.6, isPro: true }, createdAt: Date.now() - 21600000 },
  { id: "27", title: "Motorcycle Rental — Honda ADV 160",            price: 1200,  type: "rent",   category: "Vehicles",        condition: "Like New",     location: "Puerto Princesa, Palawan", postedAt: "2d ago", priceUnit: "/ day", imageUrl: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=400&q=80", seller: { name: "Island Moto Rent",rating: 4.7 }, createdAt: Date.now() - 172800000 },
  { id: "28", title: "Logo & Branding Design Package",               price: 3500,  type: "service", category: "IT & Digital",   condition: "New",          location: "Remote",            postedAt: "7d ago",  imageUrl: "https://images.unsplash.com/photo-1626785774625-ddcddc3445e9?w=400&q=80", seller: { name: "Creative Studio",  rating: 4.9, isPro: true }, createdAt: Date.now() - 604800000 },
  { id: "29", title: "PlayStation 5 Disc Edition + 2 Controllers",  price: 26000, type: "sell",   category: "Electronics",     condition: "Like New",     location: "Marikina City",     postedAt: "4h ago",  imageUrl: "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=400&q=80", seller: { name: "GameZone PH",     rating: 4.7 }, createdAt: Date.now() - 14400000 },
  { id: "30", title: "Coworking Space Day Pass — BGC",               price: 450,   type: "rent",   category: "Real Estate",     condition: "New",          location: "BGC, Taguig",       postedAt: "1d ago",  priceUnit: "/ day", imageUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&q=80", seller: { name: "SpaceWork BGC",   rating: 4.8, isPro: true }, createdAt: Date.now() - 86400000 },
];

// ─── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = ["All Categories", "Electronics", "Clothing", "Vehicles", "Home & Living", "Real Estate", "Sports & Outdoors", "Health & Wellness", "IT & Digital", "Education", "Food & Events", "Creative", "Hobbies", "Events", "Others"];
const CONDITIONS = ["Any Condition", "New", "Like New", "Lightly Used", "Well Used", "Heavily Used"];
const LOCATIONS  = ["Any Location", "Metro Manila", "Makati City", "Quezon City", "Taguig", "Pasig City", "Laguna", "Cavite", "Batangas", "Cebu City", "Davao City"];

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "latest",      label: "Latest"       },
  { value: "cheapest",    label: "Cheapest"     },
  { value: "expensive",   label: "Most Expensive"},
  { value: "top-rated",   label: "Top Rated"    },
];

const ITEMS_PER_PAGE = 25;

// ─── Select styled helper ───────────────────────────────────────────────────────
function FilterSelect({
  value, onChange, children, className,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full rounded-lg border border-stone-200 dark:border-white/10 bg-white dark:bg-[#1e2a3a] text-stone-700 dark:text-stone-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors appearance-none",
        className
      )}
    >
      {children}
    </select>
  );
}

// ─── Pagination helper ──────────────────────────────────────────────────────────
function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

// ─── Inner page (uses useSearchParams — requires Suspense) ─────────────────────
function HomePageInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const typeFromUrl  = (searchParams.get("type") || "all") as string;

  // ── Filter state (staging = what's in the form, applied = what's actually active)
  const [keyword,  setKeyword]  = useState("");
  const [category, setCategory] = useState("All Categories");
  const [condition, setCond]    = useState("Any Condition");
  const [location, setLocation] = useState("Any Location");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  const [applied, setApplied] = useState({
    keyword: "", category: "All Categories", condition: "Any Condition",
    location: "Any Location", priceMin: "", priceMax: "",
  });

  const [sort,        setSort]    = useState("recommended");
  const [currentPage, setPage]    = useState(1);

  // Reset page when type tab changes from URL
  useEffect(() => { setPage(1); }, [typeFromUrl]);

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const filtered = ALL_LISTINGS.filter((item) => {
    if (typeFromUrl !== "all" && item.type !== typeFromUrl) return false;
    if (applied.keyword  && !item.title.toLowerCase().includes(applied.keyword.toLowerCase())) return false;
    if (applied.category !== "All Categories" && item.category !== applied.category) return false;
    if (applied.condition !== "Any Condition" && item.condition !== applied.condition) return false;
    if (applied.location !== "Any Location" && !item.location.toLowerCase().includes(applied.location.toLowerCase())) return false;
    if (applied.priceMin !== "" && item.price < Number(applied.priceMin)) return false;
    if (applied.priceMax !== "" && item.price > Number(applied.priceMax)) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "latest")    return b.createdAt - a.createdAt;
    if (sort === "cheapest")  return a.price - b.price;
    if (sort === "expensive") return b.price - a.price;
    if (sort === "top-rated") return b.seller.rating - a.seller.rating;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const paginated  = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleSearch = () => {
    setApplied({ keyword, category, condition, location, priceMin, priceMax });
    setPage(1);
  };

  const handleClear = () => {
    setKeyword(""); setCategory("All Categories"); setCond("Any Condition");
    setLocation("Any Location"); setPriceMin(""); setPriceMax("");
    setApplied({ keyword: "", category: "All Categories", condition: "Any Condition", location: "Any Location", priceMin: "", priceMax: "" });
    setPage(1);
  };

  const hasActiveFilters = Object.values(applied).some(
    (v, i) => v !== ["", "All Categories", "Any Condition", "Any Location", "", ""][i]
  );

  // ── Tab label for hero ─────────────────────────────────────────────────────
  const tabLabel = typeFromUrl === "sell" ? "Buy" : typeFromUrl === "rent" ? "Rent" : typeFromUrl === "service" ? "Services" : null;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#111827]">

      {/* ──────────────────────────── HERO ──────────────────────────────────── */}
      <section className="relative bg-[#1a2235] overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #b45309 0%, transparent 50%), radial-gradient(circle at 80% 20%, #1e40af 0%, transparent 40%)" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">

            {/* Left: Headline */}
            <div className="max-w-xl">
              {tabLabel && (
                <span className="inline-block text-xs font-semibold bg-amber-700 text-white px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
                  {tabLabel}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-stone-100 leading-tight">
                Buy, Sell, Rent & Avail<br />
                <span className="text-stone-400">Services from people near you.</span>
              </h1>
              <p className="text-stone-400 text-sm sm:text-base mt-3 max-w-md">
                The Philippines&apos; trusted peer-to-peer marketplace. Find great deals or reach thousands of buyers — for free.
              </p>
              <div className="flex gap-3 mt-6">
                <a href="#listings" className="bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors">
                  Browse Listings
                </a>
                <Link href="/create" className="border border-stone-600 text-stone-300 hover:border-stone-400 hover:text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors">
                  Post for Free
                </Link>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="flex gap-6 sm:gap-10 shrink-0">
              {[
                { value: "12,000+", label: "Active Listings" },
                { value: "Free",    label: "To post items"   },
                { value: "PH-Wide", label: "All regions"     },
              ].map((stat, i) => (
                <div key={stat.label} className="flex items-center gap-6 sm:gap-10">
                  {i > 0 && <div className="w-px h-12 bg-stone-700" />}
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold text-stone-100">{stat.value}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────── SEARCH & FILTERS ──────────────────────────── */}
      <section id="listings" className="sticky top-[57px] z-30 bg-stone-50 dark:bg-[#111827] border-b border-stone-200 dark:border-white/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">

          {/* Search row */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search listings..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9 pr-4 bg-white dark:bg-[#1e2a3a] border-stone-200 dark:border-white/10 rounded-lg text-sm focus-visible:ring-amber-500"
              />
            </div>
            <Button
              onClick={handleSearch}
              className="bg-amber-700 hover:bg-amber-600 text-white rounded-lg px-5 shrink-0 text-sm font-semibold"
            >
              <Search size={14} className="mr-1.5" /> Search
            </Button>
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap gap-2 items-end">
            {/* Category */}
            <div className="relative min-w-[140px] flex-1">
              <FilterSelect value={category} onChange={setCategory}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </FilterSelect>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <SlidersHorizontal size={12} className="text-stone-400" />
              </div>
            </div>

            {/* Condition */}
            <div className="relative min-w-[130px] flex-1">
              <FilterSelect value={condition} onChange={setCond}>
                {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
              </FilterSelect>
            </div>

            {/* Location */}
            <div className="relative min-w-[130px] flex-1">
              <FilterSelect value={location} onChange={setLocation}>
                {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
              </FilterSelect>
            </div>

            {/* Price range */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Input
                type="number"
                placeholder="Min ₱"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="w-24 text-sm bg-white dark:bg-[#1e2a3a] border-stone-200 dark:border-white/10 rounded-lg focus-visible:ring-amber-500"
              />
              <span className="text-stone-400 text-sm shrink-0">–</span>
              <Input
                type="number"
                placeholder="Max ₱"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="w-24 text-sm bg-white dark:bg-[#1e2a3a] border-stone-200 dark:border-white/10 rounded-lg focus-visible:ring-amber-500"
              />
            </div>

            {/* Clear button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={handleClear}
                className="text-stone-500 hover:text-red-500 text-xs rounded-lg px-3 py-2 shrink-0"
              >
                <X size={13} className="mr-1" /> Clear Filters
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ──────────────────────── SORT BAR ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-200 dark:border-white/10">
        <p className="text-sm text-stone-500 dark:text-stone-400 shrink-0">
          <span className="font-semibold text-stone-700 dark:text-stone-200">{sorted.length}</span> listing{sorted.length !== 1 && "s"} found
        </p>
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-stone-400 mr-1 hidden sm:inline">Sort:</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setSort(opt.value); setPage(1); }}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-full transition-all",
                sort === opt.value
                  ? "bg-[#1a2235] dark:bg-amber-700 text-white"
                  : "text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-white/10 hover:text-stone-700 dark:hover:text-white"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ──────────────────────── RESULTS GRID ──────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {paginated.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {paginated.map((listing) => (
              <PostCard key={listing.id} {...listing} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <PackageSearch size={48} className="text-stone-300 dark:text-stone-600 mb-4" />
            <h3 className="text-lg font-semibold text-stone-600 dark:text-stone-400">No listings found</h3>
            <p className="text-sm text-stone-400 dark:text-stone-500 mt-1 max-w-xs">
              Try adjusting your search keyword or filters to find what you&apos;re looking for.
            </p>
            <button
              onClick={handleClear}
              className="mt-4 text-sm font-medium text-amber-700 dark:text-amber-500 hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* ──────────────── PAGINATION ──────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 mt-10">
            {/* Prev */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-white/10 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={15} /> Prev
            </button>

            {/* Page numbers */}
            {getPageNumbers(currentPage, totalPages).map((pg, i) =>
              pg === "..." ? (
                <span key={`ellipsis-${i}`} className="px-2 text-stone-400 text-sm select-none">…</span>
              ) : (
                <button
                  key={pg}
                  onClick={() => setPage(pg as number)}
                  className={cn(
                    "w-9 h-9 text-sm font-semibold rounded-lg transition-colors",
                    currentPage === pg
                      ? "bg-[#1a2235] dark:bg-amber-700 text-white"
                      : "text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-white/10"
                  )}
                >
                  {pg}
                </button>
              )
            )}

            {/* Next */}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-white/10 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* Items count text */}
        {sorted.length > 0 && (
          <p className="text-center text-xs text-stone-400 dark:text-stone-600 mt-3">
            Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, sorted.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, sorted.length)} of {sorted.length} listings
          </p>
        )}
      </main>
    </div>
  );
}

// ─── Exported page — wraps inner content in Suspense ──────────────────────────
export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-amber-700 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <HomePageInner />
    </Suspense>
  );
}
