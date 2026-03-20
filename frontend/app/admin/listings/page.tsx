"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  Filter,
  X,
  ShoppingBag,
  Home,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getAdminListings,
  deleteAdminListing,
  type AdminListingRecord,
} from "@/services/adminListingsService";

type ListingType = "SELL" | "RENT" | "SERVICE";
type ListingStatus = "AVAILABLE" | "SOLD" | "RENTED" | "COMPLETED" | "HIDDEN";
type SortField =
  | "title"
  | "type"
  | "price"
  | "views"
  | "created"
  | "seller"
  | "status";
type SortDir = "asc" | "desc";

interface AdminListing {
  id: string;
  title: string;
  type: ListingType;
  category: string;
  price: number;
  unit: string;
  location: string;
  status: ListingStatus;
  seller: string;
  views: number;
  created: string;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

const TYPE_CONFIG: Record<
  ListingType,
  { label: string; cls: string; Icon: React.ElementType }
> = {
  SELL: {
    label: "For Sale",
    cls: "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300",
    Icon: ShoppingBag,
  },
  RENT: {
    label: "For Rent",
    cls: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
    Icon: Home,
  },
  SERVICE: {
    label: "Service",
    cls: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
    Icon: Wrench,
  },
};

const STATUS_CONFIG: Record<ListingStatus, string> = {
  AVAILABLE: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
  SOLD: "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400",
  RENTED: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
  COMPLETED:
    "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400",
  HIDDEN: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
};

const phpFmt = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
});

function SortIcon({
  field,
  sort,
}: {
  field: SortField;
  sort: { field: SortField; dir: SortDir };
}) {
  if (sort.field !== field)
    return (
      <ChevronsUpDown className="w-3 h-3 text-stone-300 dark:text-stone-600 ml-1" />
    );
  return sort.dir === "asc" ? (
    <ChevronUp className="w-3 h-3 ml-1" />
  ) : (
    <ChevronDown className="w-3 h-3 ml-1" />
  );
}

export default function ListingsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({
    field: "created",
    dir: "desc",
  });
  const [page, setPage] = useState(1);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [actionLoadingListingId, setActionLoadingListingId] = useState<string | null>(null);
  const PER_PAGE = 8;

  useEffect(() => {
    let mounted = true;

    const loadListings = async () => {
      setLoadingListings(true);
      try {
        const data = await getAdminListings();
        if (!mounted) return;
        setListings((data ?? []) as AdminListingRecord[]);
      } catch (err) {
        if (!mounted) return;
        const message = typeof err === "string" ? err : "Failed to load listings";
        toast.error(message, { position: "top-center" });
      } finally {
        if (mounted) setLoadingListings(false);
      }
    };

    void loadListings();
    return () => {
      mounted = false;
    };
  }, []);

  const categoryOptions = useMemo(() => {
    const unique = Array.from(new Set(listings.map((l) => l.category.trim()).filter(Boolean)));
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [listings]);

  function toggleSort(field: SortField) {
    setSort((s) =>
      s.field === field
        ? { field, dir: s.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "desc" },
    );
    setPage(1);
  }

  const filtered = useMemo(() => {
    let data = [...listings];
    if (search)
      data = data.filter(
        (l) =>
          l.title.toLowerCase().includes(search.toLowerCase()) ||
          l.seller.toLowerCase().includes(search.toLowerCase()),
      );
    if (typeFilter !== "ALL") data = data.filter((l) => l.type === typeFilter);
    if (statusFilter !== "ALL")
      data = data.filter((l) => l.status === statusFilter);
    if (categoryFilter !== "ALL")
      data = data.filter((l) => l.category === categoryFilter);
    data.sort((a, b) => {
      let va: any, vb: any;
      if (sort.field === "title") {
        va = a.title;
        vb = b.title;
      } else if (sort.field === "price") {
        va = a.price;
        vb = b.price;
      } else if (sort.field === "views") {
        va = a.views;
        vb = b.views;
      } else if (sort.field === "seller") {
        va = a.seller;
        vb = b.seller;
      } else if (sort.field === "type") {
        va = a.type;
        vb = b.type;
      } else if (sort.field === "status") {
        va = a.status;
        vb = b.status;
      } else {
        va = new Date(a.created).getTime();
        vb = new Date(b.created).getTime();
      }
      return sort.dir === "asc" ? (va > vb ? 1 : -1) : va < vb ? 1 : -1;
    });
    return data;
  }, [listings, search, typeFilter, statusFilter, categoryFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  async function handleRemove(id: string) {
    if (!window.confirm("Remove this listing permanently?")) return;

    setActionLoadingListingId(id);
    try {
      await deleteAdminListing(id);
      setListings((ls) => ls.filter((l) => l.id !== id));
      toast.success("Listing removed successfully", { position: "top-center" });
    } catch (err) {
      const message = typeof err === "string" ? err : "Failed to remove listing";
      toast.error(message, { position: "top-center" });
    } finally {
      setActionLoadingListingId(null);
      setOpenMenu(null);
    }
  }

  const TH = ({ label, field }: { label: string; field: SortField }) => (
    <th
      className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest cursor-pointer select-none hover:text-stone-700 dark:hover:text-stone-200 whitespace-nowrap"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIcon field={field} sort={sort} />
      </span>
    </th>
  );

  return (
    <div className="p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-50">
          Listings
        </h2>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by title or seller…"
              className="w-full pl-9 pr-3 py-2.5 bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              {
                value: typeFilter,
                setter: setTypeFilter,
                options: [
                  ["ALL", "All Types"],
                  ["SELL", "For Sale"],
                  ["RENT", "For Rent"],
                  ["SERVICE", "Service"],
                ],
              },
              {
                value: statusFilter,
                setter: setStatusFilter,
                options: [
                  ["ALL", "All Status"],
                  ["AVAILABLE", "Available"],
                  ["SOLD", "Sold"],
                  ["RENTED", "Rented"],
                  ["HIDDEN", "Hidden"],
                ],
              },
              {
                value: categoryFilter,
                setter: setCategoryFilter,
                options: [
                  ["ALL", "All Categories"],
                  ...categoryOptions.map((category) => [category, category] as [string, string]),
                ],
              },
            ].map(({ value, setter, options }, i) => (
              <div key={i} className="relative">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
                <select
                  value={value}
                  onChange={(e) => {
                    setter(e.target.value);
                    setPage(1);
                  }}
                  className="pl-7 pr-8 py-2.5 bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl text-sm text-stone-700 dark:text-stone-200 outline-none focus:border-stone-400 transition-colors appearance-none cursor-pointer"
                >
                  {options.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {(search || typeFilter !== "ALL" || statusFilter !== "ALL") && (
              <button
                onClick={() => {
                  setSearch("");
                  setTypeFilter("ALL");
                  setStatusFilter("ALL");
                  setPage(1);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-2.5">
          {loadingListings ? "Loading listings..." : `Showing ${paged.length} of ${filtered.length} listings`}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f]">
              <tr>
                <TH label="Title" field="title" />
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                  Type
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                  Category
                </th>
                <TH label="Price" field="price" />
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                  Status
                </th>
                <TH label="Views" field="views" />
                <TH label="Seller" field="seller" />
                <TH label="Created" field="created" />
                <th className="py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-[#2a2d3e]">
              {loadingListings ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-16 text-center text-sm text-stone-400 dark:text-stone-500"
                  >
                    Loading listings...
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-16 text-center text-sm text-stone-400 dark:text-stone-500"
                  >
                    No listings match the current filters.
                  </td>
                </tr>
              ) : (
                paged.map((listing) => {
                  const tc = TYPE_CONFIG[listing.type];
                  const Icon = tc.Icon;
                  return (
                    <tr
                      key={listing.id}
                      className="hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors"
                    >
                      <td className="py-3.5 px-4 max-w-50">
                        <p className="text-xs font-bold text-stone-800 dark:text-stone-100 truncate">
                          {listing.title}
                        </p>
                        <p className="text-[11px] text-stone-400 dark:text-stone-500 truncate">
                          {listing.location}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                            tc.cls,
                          )}
                        >
                          <Icon className="w-2.5 h-2.5" /> {tc.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
                        {listing.category}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="text-xs font-bold text-stone-800 dark:text-stone-100">
                          {phpFmt.format(listing.price)}
                        </p>
                        <p className="text-[11px] text-stone-400 dark:text-stone-500">
                          {listing.unit}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full",
                            STATUS_CONFIG[listing.status],
                          )}
                        >
                          {listing.status.charAt(0) +
                            listing.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-stone-600 dark:text-stone-300 text-center">
                        {listing.views.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-stone-600 dark:text-stone-300 whitespace-nowrap">
                        {listing.seller}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
                        {formatDateTime(listing.created)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/listing/${listing.id}`}
                            target="_blank"
                            className="flex items-center gap-1 text-[11px] font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 transition-colors px-2 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-[#252837]"
                          >
                            <ExternalLink className="w-3 h-3" /> View
                          </Link>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenu((p) =>
                                  p === listing.id ? null : listing.id,
                                )
                              }
                              disabled={actionLoadingListingId === listing.id}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 dark:hover:bg-[#252837] hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {openMenu === listing.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setOpenMenu(null)}
                                />
                                <div className="absolute right-0 top-8 z-20 bg-white dark:bg-[#1c1f2e] border border-stone-200 dark:border-[#2a2d3e] rounded-xl shadow-xl overflow-hidden min-w-40">
                                  <button
                                    onClick={() => handleRemove(listing.id)}
                                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors border-t border-stone-100 dark:border-[#2a2d3e]"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Remove
                                    Listing
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100 dark:border-[#2a2d3e]">
          <p className="text-xs text-stone-400 dark:text-stone-500">
            Page {page} of {totalPages} · {filtered.length} results
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-[#2a2d3e] hover:bg-stone-50 dark:hover:bg-[#252837] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={cn(
                  "w-8 h-8 rounded-lg text-xs font-bold transition-colors",
                  page === n
                    ? "bg-[#1e2433] text-white"
                    : "text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-[#252837]",
                )}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-[#2a2d3e] hover:bg-stone-50 dark:hover:bg-[#252837] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
