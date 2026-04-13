"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PostCard from "@/components/post-card";
import { getHomeListings, type HomeListing } from "@/services/listingFeedService";
import { getProvinces, getCitiesByProvince, type LocationOption } from "@/services/locationService";
import { useUser } from "@/utils/UserContext";
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LISTING_CATEGORIES } from "@/types/listings";

type ListingWithMeta = HomeListing;

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
  value, onChange, children, className, ...props
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange" | "children" | "className">) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...props}
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
  const { user, isAuth } = useUser();
  const typeFromUrl  = (searchParams.get("type") || "all") as string;

  const [allListings, setAllListings] = useState<ListingWithMeta[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  // ── Filter state (staging = what's in the form, applied = what's actually active)
  const [keyword,  setKeyword]  = useState("");
  const [category, setCategory] = useState("All Categories");
  const [condition, setCond]    = useState("Any Condition");
  const [provinceCode, setProvinceCode] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [provinceName, setProvinceName] = useState("Province");
  const [cityName, setCityName] = useState("City/Municipality");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [provinceOptions, setProvinceOptions] = useState<LocationOption[]>([]);
  const [cityOptions, setCityOptions] = useState<LocationOption[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [hasFetchedProvinces, setHasFetchedProvinces] = useState(false);
  const [fetchedCitiesProvinceCode, setFetchedCitiesProvinceCode] = useState("");

  const [applied, setApplied] = useState({
    keyword: "", category: "All Categories", condition: "Any Condition",
    province: "Province", city: "City/Municipality", priceMin: "", priceMax: "",
  });

  const [sort,        setSort]    = useState("recommended");
  const [currentPage, setPage]    = useState(1);

  // Reset page when type tab changes from URL
  useEffect(() => { setPage(1); }, [typeFromUrl]);

  const totalPages = Math.max(1, Math.ceil(allListings.length / ITEMS_PER_PAGE));
  const paginated  = allListings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    let mounted = true;

    const loadListings = async () => {
      setLoadingListings(true);
      try {
        const data = await getHomeListings({
          type: typeFromUrl,
          keyword: applied.keyword,
          category: applied.category,
          condition: applied.condition,
          province: applied.province,
          city: applied.city,
          priceMin: applied.priceMin,
          priceMax: applied.priceMax,
          sort,
        });

        if (!mounted) return;
        setAllListings(data);
      } catch {
        if (!mounted) return;
        setAllListings([]);
      } finally {
        if (mounted) setLoadingListings(false);
      }
    };

    loadListings();
    return () => {
      mounted = false;
    };
  }, [applied, sort, typeFromUrl]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleSearch = () => {
    setApplied({ keyword, category, condition, province: provinceName, city: cityName, priceMin, priceMax });
    setPage(1);
  };

  const handleClear = () => {
    setKeyword(""); setCategory("All Categories"); setCond("Any Condition");
    setProvinceCode(""); setCityCode("");
    setProvinceName("Province"); setCityName("City/Municipality");
    setCityOptions([]); setFetchedCitiesProvinceCode("");
    setPriceMin(""); setPriceMax("");
    setApplied({ keyword: "", category: "All Categories", condition: "Any Condition", province: "Province", city: "City/Municipality", priceMin: "", priceMax: "" });
    setPage(1);
  };

  const loadProvincesOnDemand = async () => {
    if (hasFetchedProvinces || loadingProvinces) return;

    setLoadingProvinces(true);
    try {
      const data = await getProvinces();
      setProvinceOptions(data);
      setHasFetchedProvinces(true);
    } catch (err) {
      const message = typeof err === "string" ? err : "Failed to load provinces";
      toast.error(message, { position: "top-center" });
    } finally {
      setLoadingProvinces(false);
    }
  };

  const loadCitiesOnDemand = async (targetProvinceCode?: string) => {
    const effectiveProvinceCode = targetProvinceCode ?? provinceCode;
    if (!effectiveProvinceCode || loadingCities) return;
    if (fetchedCitiesProvinceCode === effectiveProvinceCode) return;

    setLoadingCities(true);
    try {
      const data = await getCitiesByProvince(effectiveProvinceCode);
      setCityOptions(data);
      setFetchedCitiesProvinceCode(effectiveProvinceCode);
    } catch (err) {
      const message = typeof err === "string" ? err : "Failed to load cities/municipalities";
      toast.error(message, { position: "top-center" });
    } finally {
      setLoadingCities(false);
    }
  };

  useEffect(() => {
    if (!provinceCode) return;
    if (fetchedCitiesProvinceCode === provinceCode) return;
    if (loadingCities) return;

    void loadCitiesOnDemand(provinceCode);
  }, [provinceCode, fetchedCitiesProvinceCode, loadingCities]);

  const hasActiveFilters = Object.values(applied).some(
    (v, i) => v !== ["", "All Categories", "Any Condition", "Province", "City/Municipality", "", ""][i]
  );

  const handlePostForFree = () => {
    if (!isAuth) {
      router.push("/login");
      return;
    }

    if ((user?.status ?? "").toLowerCase() !== "verified") {
      router.push("/become-seller");
      return;
    }

    router.push("/create");
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#111827]">

      {/* ──────────────────────────── HERO ──────────────────────────────────── */}
      <section className="max-h-max relative bg-[#1a2235] overflow-hidden">

    {/* Floating orbs */}
        <div className="orb orb-amber" />
        <div className="orb orb-blue" />
        <div className="orb orb-white" />

        {/* Background texture */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #b45309 0%, transparent 50%), radial-gradient(circle at 80% 20%, #1e40af 0%, transparent 40%)" }}
        />
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-7 py-8 sm:py-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">

            {/* Left: Headline */}
            <div className="max-w-xl animate-fade-in-up">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-stone-100 leading-tight">
                Buy, Sell, Rent & Avail Services<br />
                <span className="text-stone-400">from people near you.</span>
              </h1>
              <p className="text-stone-400 text-sm sm:text-base mt-3 max-w-md">
                The Philippines&apos; trusted peer-to-peer marketplace. Find great deals or reach thousands of buyers for free.
              </p>
              <div className="flex gap-3 mt-6">
                <a href="#listings" className="bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors">
                  Browse Listings
                </a>
                {user?.status === "VERIFIED" ? (
                  <button
                    onClick={handlePostForFree}
                    className="border border-stone-600 text-stone-300 hover:bg-amber-400 hover:border-amber-400 hover:text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors"
                  >
                    Post for Free
                  </button>
                ) : (
                  <button
                    onClick={handlePostForFree}
                    className="border border-stone-600 text-stone-300 hover:bg-amber-400 hover:border-amber-400 hover:text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors"
                  >
                    Become a Seller
                  </button>
                )}
                
              </div>
            </div>

            {/* Right: Stats */}
            <div className="flex gap-6 sm:gap-10 shrink-0">
              {[
                { value: `${allListings.length.toLocaleString()}+`, label: "Active Listings" },
                { value: "Free",    label: "Listing of items"   },
                { value: "PH-Wide", label: "All regions"     },
              ].map((stat, i) => (
                <div key={stat.label} className="flex items-center gap-6 sm:gap-10">
                  {i > 0 && <div className="w-px h-12 bg-stone-700" />}
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold text-stone-100">{stat.value}</p>
                    <p className="text-sm text-stone-300 mt-0.5">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────── SEARCH & FILTERS ──────────────────────────── */}
      <section id="listings" className="bg-stone-50 dark:bg-[#111827] border-b border-stone-200 dark:border-white/10 shadow-sm">
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
            <div className="relative min-w-35 flex-1">
              <FilterSelect value={category} onChange={setCategory}>
                <option value="">All Categories</option>
                {LISTING_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </FilterSelect>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <SlidersHorizontal size={12} className="text-stone-400" />
              </div>
            </div>

            {/* Province */}
            <div className="relative min-w-32.5 flex-1">
              <FilterSelect
                value={provinceCode}
                onChange={(code) => {
                  const selected = provinceOptions.find((p) => p.code === code);
                  setProvinceCode(code);
                  setProvinceName(selected?.name ?? "Province");
                  setCityCode("");
                  setCityName("City/Municipality");
                  setCityOptions([]);
                  setFetchedCitiesProvinceCode("");
                }}
                disabled={loadingProvinces}
                onMouseDown={(e) => {
                  if (!hasFetchedProvinces) {
                    e.preventDefault();
                    void loadProvincesOnDemand();
                  }
                }}
                className={cn(loadingProvinces && "cursor-wait")}
              >
                <option value="">{loadingProvinces ? "Loading provinces..." : "Province"}</option>
                {provinceOptions.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
              </FilterSelect>
            </div>

            {/* City/Municipality */}
            <div className="relative min-w-32.5 flex-1">
              <FilterSelect
                value={cityCode}
                onChange={(code) => {
                  const selected = cityOptions.find((c) => c.code === code);
                  setCityCode(code);
                  setCityName(selected?.name ?? "City/Municipality");
                }}
                disabled={!provinceCode || loadingCities}
                onMouseDown={(e) => {
                  if (!provinceCode) {
                    e.preventDefault();
                    return;
                  }

                  if (fetchedCitiesProvinceCode !== provinceCode) {
                    e.preventDefault();
                    void loadCitiesOnDemand();
                  }
                }}
                className={cn((!provinceCode || loadingCities) && "cursor-wait")}
              >
                <option value="">
                  {!provinceCode
                    ? "Select province first"
                    : loadingCities
                      ? "Loading cities/municipalities..."
                      : "City/Municipality"}
                </option>
                {cityOptions.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
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
                className="text-stone-500 hover:text-red-500 text-sm rounded-lg px-3 py-2 shrink-0"
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
          <span className="font-semibold text-stone-700 dark:text-stone-200">{allListings.length}</span> listing{allListings.length !== 1 && "s"} found
        </p>
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-sm text-stone-400 mr-2 hidden sm:inline">Sort:</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setSort(opt.value); setPage(1); }}
              className={cn(
                "tab-page-base",
                sort === opt.value
                  ? "tab-active"
                  : "tab-inactive"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ──────────────────────── RESULTS GRID ──────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loadingListings ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-amber-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : paginated.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
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
        {allListings.length > 0 && (
          <p className="text-center text-sm text-stone-400 dark:text-stone-600 mt-3">
            Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, allListings.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, allListings.length)} of {allListings.length} listings
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
