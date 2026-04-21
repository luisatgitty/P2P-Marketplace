"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Trash2,
  Ban,
  CircleDashed,
  RotateCw,
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
  toggleAdminListingVisibility,
  type AdminListingRecord,
} from "@/services/adminListingsService";

// ── shadcn components ──────────────────────────────────────────────────────────
import { Button }            from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input }             from "@/components/ui/input";
import { Separator }         from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImageLink } from "@/components/image-link";

// ── Types ──────────────────────────────────────────────────────────────────────
type ListingType   = "SELL" | "RENT" | "SERVICE";
type ListingStatus = "AVAILABLE" | "UNAVAILABLE" | "SOLD" | "BANNED" | "DELETED";
type SortField     = "title" | "type" | "price" | "transactions" | "reviews" | "created" | "updated" | "bannedUntil" | "deletedAt" | "owner" | "status";
type SortDir       = "asc" | "desc";

interface AdminListing {
  id:       string;
  title:    string;
  type:     ListingType;
  category: string;
  price:    number;
  unit:     string;
  location: string;
  status:   ListingStatus;
  listing_image_url: string;
  seller_id: string;
  seller:   string;
  seller_location: string;
  seller_profile_image_url: string;
  transaction_count: number;
  review_count: number;
  created:  string;
  updated_at: string;
  banned_until: string | null;
  deleted_at: string | null;
  action_by_name: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day:   "2-digit",
    year:  "numeric",
  });
}

function getCurrentAdminDisplayName(): string {
  if (typeof window === "undefined") return "";

  try {
    const rawUser = localStorage.getItem("auth_user");
    if (!rawUser) return "";

    const parsed = JSON.parse(rawUser) as {
      firstName?: string;
      lastName?: string;
      email?: string;
    };

    const firstName = (parsed?.firstName ?? "").trim();
    const lastName = (parsed?.lastName ?? "").trim();
    const fullName = `${firstName} ${lastName}`.trim();

    if (fullName) return fullName;
    return (parsed?.email ?? "").trim();
  } catch {
    return "";
  }
}

const TYPE_CONFIG: Record<ListingType, { label: string; cls: string; Icon: React.ElementType }> = {
  SELL:    { label: "For Sale",  cls: "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300",       Icon: ShoppingBag },
  RENT:    { label: "For Rent",  cls: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",        Icon: Home        },
  SERVICE: { label: "Service",   cls: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300", Icon: Wrench      },
};

const STATUS_CONFIG: Record<ListingStatus, string> = {
  AVAILABLE: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
  UNAVAILABLE: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  SOLD:      "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400",
  BANNED:    "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
  DELETED:   "bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300",
};

const phpFmt = new Intl.NumberFormat("en-PH", {
  style:                 "currency",
  currency:              "PHP",
  minimumFractionDigits: 0,
});

// ── Sort icon ──────────────────────────────────────────────────────────────────
function SortIcon({ field, sort }: { field: SortField; sort: { field: SortField; dir: SortDir } }) {
  if (sort.field !== field)
    return <ChevronsUpDown className="w-3 h-3 text-stone-300 dark:text-stone-600 ml-1" />;
  return sort.dir === "asc"
    ? <ChevronUp   className="w-3 h-3 ml-1" />
    : <ChevronDown className="w-3 h-3 ml-1" />;
}

// ── Shared select ──────────────────────────────────────────────────────────────
function FilterSelect({
  value,
  onChange,
  options,
}: {
  value:    string;
  onChange: (v: string) => void;
  options:  [string, string][];
}) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="pl-3 pr-8 py-2 h-9 bg-transparent border border-stone-200 dark:border-[#2a2d3e] rounded-lg text-sm text-stone-700 dark:text-stone-200 outline-none focus:border-stone-400 transition-colors appearance-none cursor-pointer dark:bg-[#13151f]"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
        <svg className="w-3.5 h-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ListingsPage() {
  const [search,         setSearch]         = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter,     setTypeFilter]     = useState("ALL");
  const [statusFilter,   setStatusFilter]   = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sort,           setSort]           = useState<{ field: SortField; dir: SortDir }>({ field: "created", dir: "desc" });
  const [listings,       setListings]       = useState<AdminListing[]>([]);
  const [loadingListings,setLoadingListings]= useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoadingListingId, setActionLoadingListingId] = useState<string | null>(null);
  const FETCH_LIMIT = 15;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearch(search.trim());
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  // ── Load ──────────────────────────────────────────────────────────────────────
  const loadListings = useCallback(async (pageNumber: number) => {
    setLoadingListings(true);
    const nextOffset = (pageNumber - 1) * FETCH_LIMIT;

    try {
      const payload = await getAdminListings({
        search: debouncedSearch,
        type: typeFilter,
        status: statusFilter,
        category: categoryFilter,
        limit: FETCH_LIMIT,
        offset: nextOffset,
      });

      const received = (payload.listings ?? []) as AdminListingRecord[];
      setListings(received);
      setTotalCount(payload.total);
      setCurrentPage(pageNumber);
    } catch (err) {
      const message = typeof err === "string" ? err : "Failed to load listings";
      toast.error(message, { position: "top-center" });
    } finally {
      setLoadingListings(false);
      setIsRefreshing(false);
    }
  }, [debouncedSearch, typeFilter, statusFilter, categoryFilter]);

  useEffect(() => {
    void loadListings(currentPage);
  }, [currentPage, loadListings]);

  // ── Dynamic category options ──────────────────────────────────────────────────
  const categoryOptions = useMemo(() => {
    const unique = Array.from(new Set(listings.map(l => l.category.trim()).filter(Boolean)));
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [listings]);

  // ── Sort ──────────────────────────────────────────────────────────────────────
  function toggleSort(field: SortField) {
    setCurrentPage(1);
    setSort(s => s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: "desc" });
  }

  // ── Sort loaded chunk ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = [...listings];
    data.sort((a, b) => {
      let va: any, vb: any;
      if      (sort.field === "title")  { va = a.title;  vb = b.title;  }
      else if (sort.field === "price")  { va = a.price;  vb = b.price;  }
      else if (sort.field === "transactions") { va = a.transaction_count; vb = b.transaction_count; }
      else if (sort.field === "reviews") { va = a.review_count; vb = b.review_count; }
      else if (sort.field === "updated") { va = new Date(a.updated_at).getTime(); vb = new Date(b.updated_at).getTime(); }
      else if (sort.field === "bannedUntil") { va = a.banned_until ? new Date(a.banned_until).getTime() : 0; vb = b.banned_until ? new Date(b.banned_until).getTime() : 0; }
      else if (sort.field === "deletedAt") { va = a.deleted_at ? new Date(a.deleted_at).getTime() : 0; vb = b.deleted_at ? new Date(b.deleted_at).getTime() : 0; }
      else if (sort.field === "owner") { va = a.seller; vb = b.seller; }
      else if (sort.field === "type")   { va = a.type;   vb = b.type;   }
      else if (sort.field === "status") { va = a.status; vb = b.status; }
      else { va = new Date(a.created).getTime(); vb = new Date(b.created).getTime(); }
      return sort.dir === "asc" ? (va > vb ? 1 : -1) : va < vb ? 1 : -1;
    });
    return data;
  }, [listings, sort]);

  const availableCount   = listings.filter(l => l.status === "AVAILABLE").length;
  const unavailableCount = listings.filter(l => l.status === "UNAVAILABLE").length;
  const soldCount        = listings.filter(l => l.status === "SOLD").length;
  const bannedCount      = listings.filter(l => l.status === "BANNED").length;
  const deletedCount     = listings.filter(l => l.status === "DELETED").length;

  // ── Actions ───────────────────────────────────────────────────────────────────
  async function handleRemove(id: string) {
    if (!window.confirm("Mark this listing as deleted?")) return;
    setActionLoadingListingId(id);
    try {
      const updated = await deleteAdminListing(id);
      const deletedAtPlaceholder = new Date().toISOString();
      const actionByNamePlaceholder = getCurrentAdminDisplayName();
      setListings((prev) =>
        prev.map((listing) =>
          listing.id === id
            ? {
                ...listing,
                status: updated.status,
                deleted_at: deletedAtPlaceholder,
                action_by_name: actionByNamePlaceholder,
              }
            : listing
        )
      );
      toast.success("Listing marked as deleted.", { position: "top-center" });
    } catch (err) {
      const message = typeof err === "string" ? err : "Failed to delete listing";
      toast.error(message, { position: "top-center" });
    } finally {
      setActionLoadingListingId(null);
    }
  }

  async function handleToggleVisibility(id: string, currentStatus: ListingStatus) {
    if (currentStatus === "DELETED") {
      toast.error("Cannot update visibility for deleted listing", { position: "top-center" });
      return;
    }

    const shouldUnban = currentStatus === "BANNED";
    const confirmed = window.confirm(
      shouldUnban
        ? "Set this listing to UNAVAILABLE?"
        : "Shadow ban this listing?"
    );
    if (!confirmed) return;

    setActionLoadingListingId(id);
    try {
      const updated = await toggleAdminListingVisibility(id);
      const nextBannedUntil = updated.status === "BANNED"
        ? new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)).toISOString()
        : null;
      const actionByNamePlaceholder = getCurrentAdminDisplayName();

      setListings((prev) =>
        prev.map((listing) =>
          listing.id === id
            ? {
                ...listing,
                status: updated.status as ListingStatus,
                banned_until: nextBannedUntil,
                action_by_name: actionByNamePlaceholder || listing.action_by_name,
              }
            : listing
        )
      );
      toast.success(
        updated.status === "BANNED"
          ? "Listing is now shadow banned."
          : "Listing is now unavailable.",
        { position: "top-center" }
      );
    } catch (err) {
      const message = typeof err === "string" ? err : "Failed to update listing visibility";
      toast.error(message, { position: "top-center" });
    } finally {
      setActionLoadingListingId(null);
    }
  }

  const hasActiveFilters = search || typeFilter !== "ALL" || statusFilter !== "ALL" || categoryFilter !== "ALL";
  const totalPages = Math.max(1, Math.ceil(totalCount / FETCH_LIMIT));
  const paginationPages = useMemo(() => {
    const maxButtons = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  }, [currentPage, totalPages]);

  // ── Sortable column header ────────────────────────────────────────────────────
  const SortableTH = ({ label, field }: { label: string; field: SortField }) => (
    <TableHead
      className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest cursor-pointer select-none hover:text-stone-700 dark:hover:text-stone-200 whitespace-nowrap"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIcon field={field} sort={sort} />
      </span>
    </TableHead>
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh)] p-5 sm:p-6 flex flex-col gap-5 min-h-0">

      {/* ── Page header ── */}
      {/* <div>
        <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-50">
          Listings
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          View, search, and manage all marketplace listings
        </p>
      </div> */}

      {/* ── Summary cards — clickable to filter by status ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: "Total", count: totalCount,     status: "ALL",         color: "text-stone-700 dark:text-stone-200", Icon: ShoppingBag   },
          { label: "Available",   count: availableCount,   status: "AVAILABLE",   color: "text-teal-600 dark:text-teal-400",   Icon: CheckCircle2  },
          { label: "Unavailable", count: unavailableCount, status: "UNAVAILABLE", color: "text-amber-600 dark:text-amber-400", Icon: AlertTriangle },
          { label: "Sold",        count: soldCount,        status: "SOLD",        color: "text-stone-600 dark:text-stone-300", Icon: ShoppingBag   },
          { label: "Banned",      count: bannedCount,      status: "BANNED",      color: "text-red-600 dark:text-red-400",     Icon: Ban           },
          { label: "Deleted",     count: deletedCount,     status: "DELETED",     color: "text-stone-500 dark:text-stone-400", Icon: XCircle       },
        ].map(({ label, count, status, color, Icon }) => (
          <Card
            key={label}
            className={cn(
              "p-4 rounded-lg cursor-pointer hover:shadow-sm transition-all card-glass border border-stone-200 dark:border-[#2a2d3e]",
              statusFilter === status && "ring-2 ring-offset-1 ring-current",
            )}
            onClick={() => {
              setCurrentPage(1);
              setStatusFilter(prev => {
                if (status === "ALL") return "ALL";
                return prev === status ? "ALL" : status;
              });
            }}
          >
            <CardContent className="text-center">
              {/* <Icon className={cn("w-5 h-5 mx-auto mb-1.5", color)} /> */}
              <p className={cn("text-xl font-extrabold", color)}>{count}</p>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); }}
            placeholder="Search by title or seller…"
            className="pl-9 dark:bg-[#13151f] dark:border-[#2a2d3e]"
          />
        </div>

        {/* Filter selects */}
        <div className="flex gap-2 flex-wrap">
          <FilterSelect
            value={typeFilter}
            onChange={v => { setTypeFilter(v); setCurrentPage(1); }}
            options={[
              ["ALL",     "All Types"],
              ["SELL",    "For Sale" ],
              ["RENT",    "For Rent" ],
              ["SERVICE", "Service"  ],
            ]}
          />
          <FilterSelect
            value={categoryFilter}
            onChange={v => { setCategoryFilter(v); setCurrentPage(1); }}
            options={[
              ["ALL", "All Categories"],
              ...categoryOptions.map(c => [c, c] as [string, string]),
            ]}
          />
          <FilterSelect
            value={statusFilter}
            onChange={v => { setStatusFilter(v); setCurrentPage(1); }}
            options={[
              ["ALL",       "All Status" ],
              ["AVAILABLE", "Available"  ],
              ["UNAVAILABLE", "Unavailable"],
              ["SOLD",      "Sold"       ],
              ["BANNED",    "Banned"     ],
              ["DELETED",   "Deleted"    ],
            ]}
          />

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={() => {
                setSearch(""); setTypeFilter("ALL");
                setStatusFilter("ALL"); setCategoryFilter("ALL");
                setCurrentPage(1);
              }}
              className="hover:bg-destructive/10! text-destructive! border-destructive! focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
            >
              <X className="w-3 h-3" /> Clear
            </Button>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setIsRefreshing(true);
            void loadListings(currentPage);
          }}
          disabled={loadingListings}
          className="border-sky-600 text-sky-600! hover:bg-sky-600/10 focus-visible:border-sky-600 focus-visible:ring-sky-600/20 dark:border-sky-400 dark:text-sky-400! dark:hover:bg-sky-400/10 dark:focus-visible:border-sky-400 dark:focus-visible:ring-sky-400/40"
        >
          <RotateCw className={cn("w-3.5 h-3.5", loadingListings && isRefreshing && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* ── Table ── */}
      <Card className="p-0 rounded-lg dark:bg-[#1c1f2e] dark:border-[#2a2d3e] overflow-hidden flex-1 min-h-0">
        <CardContent className="p-0 h-full min-h-0 flex flex-col">
          <div className="overflow-auto h-full">
            <Table>
              <TableHeader>
                <TableRow className="border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f] hover:bg-stone-50 dark:hover:bg-[#13151f]">
                  <SortableTH label="Title"   field="title"   />
                  <SortableTH label="Owner"  field="owner"  />
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Type
                  </TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Category
                  </TableHead>
                  <SortableTH label="Price"   field="price"   />
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Status
                  </TableHead>
                  <SortableTH label="Transactions" field="transactions" />
                  <SortableTH label="Reviews" field="reviews" />
                  <SortableTH label="Created" field="created" />
                  <SortableTH label="Updated" field="updated" />
                  <SortableTH label="Banned Until" field="bannedUntil" />
                  <SortableTH label="Deleted At" field="deletedAt" />
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Action By
                  </TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loadingListings && filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">
                      Loading listings…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">
                      No listings match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(listing => {
                    const tc   = TYPE_CONFIG[listing.type];
                    const Icon = tc.Icon;
                    return (
                      <TableRow
                        key={listing.id}
                        className="border-stone-100 dark:border-[#2a2d3e] hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors"
                      >
                        {/* Listing */}
                        <TableCell className="py-3.5 max-w-50">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <ImageLink
                              href={`/listing/${listing.id}`}
                              newTab
                              src={listing.listing_image_url}
                              type="thumbnail"
                              label={listing.title}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-stone-800 dark:text-stone-100 truncate">
                                {listing.title}
                              </p>
                              <p className="text-xs text-stone-400 dark:text-stone-500 truncate">
                                {listing.location}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Listing Owner */}
                        <TableCell className="py-3.5 text-sm text-stone-600 dark:text-stone-300 whitespace-nowrap">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <ImageLink
                              href={`/profile?userId=${listing.seller_id}`}
                              newTab
                              src={listing.seller_profile_image_url}
                              type="profile"
                              label={listing.seller}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-stone-800 dark:text-stone-100 truncate">
                                {listing.seller}
                              </p>
                              <p className="text-xs text-stone-400 dark:text-stone-500 truncate">
                                {listing.seller_location}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Type Badge */}
                        <TableCell className="py-3.5 whitespace-nowrap">
                          <span className={cn(
                            "inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md",
                            tc.cls,
                          )}>
                            <Icon className="w-2.5 h-2.5" /> {tc.label}
                          </span>
                        </TableCell>

                        {/* Category */}
                        <TableCell className="text-sm text-stone-500 dark:text-stone-400">
                          {listing.category}
                        </TableCell>

                        {/* Price */}
                        <TableCell className="py-3.5 whitespace-nowrap">
                          <p className="text-sm font-bold text-stone-800 dark:text-stone-100">
                            {phpFmt.format(listing.price)}
                          </p>
                          <p className="text-xs text-stone-400 dark:text-stone-500">
                            {listing.unit}
                          </p>
                        </TableCell>

                        {/* Status badge */}
                        <TableCell className="py-3.5 whitespace-nowrap">
                          <span className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded-md",
                            STATUS_CONFIG[listing.status],
                          )}>
                            {listing.status.charAt(0) + listing.status.slice(1).toLowerCase()}
                          </span>
                        </TableCell>

                        {/* Transactions */}
                        <TableCell className="py-3.5 text-sm font-semibold text-stone-600 dark:text-stone-300 text-center">
                          {listing.transaction_count.toLocaleString()}
                        </TableCell>

                        {/* Reviews */}
                        <TableCell className="py-3.5 text-sm font-semibold text-stone-600 dark:text-stone-300 text-center">
                          {listing.review_count.toLocaleString()}
                        </TableCell>

                        {/* Created */}
                        <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                          {formatDateTime(listing.created)}
                        </TableCell>

                        {/* Updated */}
                        <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                          {formatDateTime(listing.updated_at)}
                        </TableCell>

                        {/* Banned Until */}
                        <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                          {formatDateTime(listing.banned_until)}
                        </TableCell>

                        {/* Deleted At */}
                        <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                          {formatDateTime(listing.deleted_at)}
                        </TableCell>

                        {/* Action By */}
                        <TableCell className="py-3.5 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
                          <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                            {listing.action_by_name || "—"}
                          </p>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            {/* Shadow Ban Button */}
                            {(listing.status === "AVAILABLE" || listing.status === "BANNED") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                title={listing.status === "BANNED" ? "Unban" : "Shadow Ban 3 Days"}
                                aria-label={listing.status === "BANNED" ? "Unban" : "Shadow Ban 3 Days"}
                                onClick={() => handleToggleVisibility(listing.id, listing.status)}
                                disabled={actionLoadingListingId === listing.id}
                                className="w-7 h-7 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-700 disabled:opacity-50"
                              >
                                {listing.status === "BANNED" ? <CircleDashed className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                              </Button>
                            )}
                            {listing.status !== "DELETED" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                title="Delete listing"
                                aria-label="Delete listing"
                                onClick={() => handleRemove(listing.id)}
                                disabled={actionLoadingListingId === listing.id}
                                className="w-7 h-7 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}

              </TableBody>
            </Table>
          </div>

          <Separator className="dark:bg-[#2a2d3e]" />
          <div className="px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-stone-400 dark:text-stone-500">
            <span>
              Showing {filtered.length.toLocaleString()} of {totalCount.toLocaleString()} result{totalCount !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={loadingListings || currentPage <= 1}
                className="h-8 px-2.5"
              >
                Prev
              </Button>
              {paginationPages.map((page) => (
                <Button
                  key={page}
                  type="button"
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  disabled={loadingListings}
                  className="h-8 min-w-8 px-2"
                >
                  {page}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={loadingListings || currentPage >= totalPages}
                className="h-8 px-2.5"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
