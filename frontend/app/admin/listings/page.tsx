"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ExternalLink,
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

// ── Types ──────────────────────────────────────────────────────────────────────
type ListingType   = "SELL" | "RENT" | "SERVICE";
type ListingStatus = "AVAILABLE" | "SOLD" | "RENTED" | "COMPLETED" | "HIDDEN";
type SortField     = "title" | "type" | "price" | "views" | "created" | "seller" | "status";
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
  seller_profile_image_url: string;
  views:    number;
  created:  string;
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

const TYPE_CONFIG: Record<ListingType, { label: string; cls: string; Icon: React.ElementType }> = {
  SELL:    { label: "For Sale",  cls: "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300",       Icon: ShoppingBag },
  RENT:    { label: "For Rent",  cls: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",        Icon: Home        },
  SERVICE: { label: "Service",   cls: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300", Icon: Wrench      },
};

const STATUS_CONFIG: Record<ListingStatus, string> = {
  AVAILABLE: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
  SOLD:      "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400",
  RENTED:    "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
  COMPLETED: "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400",
  HIDDEN:    "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
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

function Avatar({ src, alt, fallback }: { src?: string; alt: string; fallback: string }) {
  if (src) {
    return <img src={src} alt={alt} className="w-8 h-8 rounded-full object-cover border border-stone-200 dark:border-[#2a2d3e] shrink-0" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-[#2a2d3e] border border-stone-200 dark:border-[#2a2d3e] flex items-center justify-center text-[10px] font-bold text-stone-700 dark:text-stone-200 shrink-0">
      {fallback}
    </div>
  );
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
        className="pl-3 pr-8 py-2 h-9 bg-transparent border border-stone-200 dark:border-[#2a2d3e] rounded-md text-sm text-stone-700 dark:text-stone-200 outline-none focus:border-stone-400 transition-colors appearance-none cursor-pointer dark:bg-[#13151f]"
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
  const [typeFilter,     setTypeFilter]     = useState("ALL");
  const [statusFilter,   setStatusFilter]   = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sort,           setSort]           = useState<{ field: SortField; dir: SortDir }>({ field: "created", dir: "desc" });
  const [page,           setPage]           = useState(1);
  const [listings,       setListings]       = useState<AdminListing[]>([]);
  const [loadingListings,setLoadingListings]= useState(true);
  const [actionLoadingListingId, setActionLoadingListingId] = useState<string | null>(null);
  const PER_PAGE = 8;

  // ── Load ──────────────────────────────────────────────────────────────────────
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
    return () => { mounted = false; };
  }, []);

  // ── Dynamic category options ──────────────────────────────────────────────────
  const categoryOptions = useMemo(() => {
    const unique = Array.from(new Set(listings.map(l => l.category.trim()).filter(Boolean)));
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [listings]);

  // ── Sort ──────────────────────────────────────────────────────────────────────
  function toggleSort(field: SortField) {
    setSort(s => s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: "desc" });
    setPage(1);
  }

  // ── Filter + sort + paginate ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = [...listings];
    if (search)
      data = data.filter(l =>
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.seller.toLowerCase().includes(search.toLowerCase()),
      );
    if (typeFilter     !== "ALL") data = data.filter(l => l.type     === typeFilter);
    if (statusFilter   !== "ALL") data = data.filter(l => l.status   === statusFilter);
    if (categoryFilter !== "ALL") data = data.filter(l => l.category === categoryFilter);
    data.sort((a, b) => {
      let va: any, vb: any;
      if      (sort.field === "title")  { va = a.title;  vb = b.title;  }
      else if (sort.field === "price")  { va = a.price;  vb = b.price;  }
      else if (sort.field === "views")  { va = a.views;  vb = b.views;  }
      else if (sort.field === "seller") { va = a.seller; vb = b.seller; }
      else if (sort.field === "type")   { va = a.type;   vb = b.type;   }
      else if (sort.field === "status") { va = a.status; vb = b.status; }
      else { va = new Date(a.created).getTime(); vb = new Date(b.created).getTime(); }
      return sort.dir === "asc" ? (va > vb ? 1 : -1) : va < vb ? 1 : -1;
    });
    return data;
  }, [listings, search, typeFilter, statusFilter, categoryFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged      = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // ── Actions ───────────────────────────────────────────────────────────────────
  async function handleRemove(id: string) {
    if (!window.confirm("Remove this listing permanently?")) return;
    setActionLoadingListingId(id);
    try {
      await deleteAdminListing(id);
      setListings(ls => ls.filter(l => l.id !== id));
      toast.success("Listing removed successfully", { position: "top-center" });
    } catch (err) {
      const message = typeof err === "string" ? err : "Failed to remove listing";
      toast.error(message, { position: "top-center" });
    } finally {
      setActionLoadingListingId(null);
    }
  }

  const hasActiveFilters = search || typeFilter !== "ALL" || statusFilter !== "ALL" || categoryFilter !== "ALL";

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
    <div className="p-5 sm:p-6 space-y-5">

      {/* ── Page header ── */}
      <div>
        <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-50">
          Listings
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          View, search, and manage all marketplace listings
        </p>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by title or seller…"
            className="pl-9 dark:bg-[#13151f] dark:border-[#2a2d3e]"
          />
        </div>

        {/* Filter selects */}
        <div className="flex gap-2 flex-wrap">
          <FilterSelect
            value={typeFilter}
            onChange={v => { setTypeFilter(v); setPage(1); }}
            options={[
              ["ALL",     "All Types"],
              ["SELL",    "For Sale" ],
              ["RENT",    "For Rent" ],
              ["SERVICE", "Service"  ],
            ]}
          />
          <FilterSelect
            value={statusFilter}
            onChange={v => { setStatusFilter(v); setPage(1); }}
            options={[
              ["ALL",       "All Status" ],
              ["AVAILABLE", "Available"  ],
              ["SOLD",      "Sold"       ],
              ["RENTED",    "Rented"     ],
              ["HIDDEN",    "Hidden"     ],
            ]}
          />
          <FilterSelect
            value={categoryFilter}
            onChange={v => { setCategoryFilter(v); setPage(1); }}
            options={[
              ["ALL", "All Categories"],
              ...categoryOptions.map(c => [c, c] as [string, string]),
            ]}
          />

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch(""); setTypeFilter("ALL");
                setStatusFilter("ALL"); setCategoryFilter("ALL");
                setPage(1);
              }}
              className="gap-1.5 border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 hover:border-red-300"
            >
              <X className="w-3 h-3" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <Card className="p-0 rounded-lg dark:bg-[#1c1f2e] dark:border-[#2a2d3e] overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f] hover:bg-stone-50 dark:hover:bg-[#13151f]">
                  <SortableTH label="Title"   field="title"   />
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
                  <SortableTH label="Views"   field="views"   />
                  <SortableTH label="Seller"  field="seller"  />
                  <SortableTH label="Created" field="created" />
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loadingListings ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">
                      Loading listings…
                    </TableCell>
                  </TableRow>
                ) : paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">
                      No listings match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map(listing => {
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
                            <Link
                              href={`/listing/${listing.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View listing"
                              aria-label="View listing"
                              className="shrink-0"
                            >
                              {listing.listing_image_url ? (
                                <img
                                  src={listing.listing_image_url}
                                  alt={listing.title}
                                  className="w-11 h-11 rounded-md object-cover border border-stone-200 dark:border-[#2a2d3e] shrink-0"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-md bg-stone-100 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] flex items-center justify-center shrink-0">
                                  📦
                                </div>
                              )}
                            </Link>
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

                        {/* Type badge */}
                        <TableCell className="py-3.5 whitespace-nowrap">
                          <span className={cn(
                            "inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full",
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
                            "text-xs font-bold px-2 py-0.5 rounded-full",
                            STATUS_CONFIG[listing.status],
                          )}>
                            {listing.status.charAt(0) + listing.status.slice(1).toLowerCase()}
                          </span>
                        </TableCell>

                        {/* Views */}
                        <TableCell className="py-3.5 text-sm font-semibold text-stone-600 dark:text-stone-300 text-center">
                          {listing.views.toLocaleString()}
                        </TableCell>

                        {/* Seller */}
                        <TableCell className="py-3.5 text-sm text-stone-600 dark:text-stone-300 whitespace-nowrap">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Link
                              href={`/profile?userId=${listing.seller_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View seller profile"
                              aria-label="View seller profile"
                              className="shrink-0"
                            >
                              <Avatar
                                src={listing.seller_profile_image_url}
                                alt={listing.seller}
                                fallback={listing.seller?.charAt(0)?.toUpperCase() || "U"}
                              />
                            </Link>
                            <span className="truncate">{listing.seller}</span>
                          </div>
                        </TableCell>

                        {/* Created */}
                        <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                          {formatDateTime(listing.created)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              title="Remove listing"
                              aria-label="Remove listing"
                              onClick={() => handleRemove(listing.id)}
                              disabled={actionLoadingListingId === listing.id}
                              className="w-7 h-7 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* ── Pagination ── */}
          <Separator className="dark:bg-[#2a2d3e]" />
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm text-stone-400 dark:text-stone-500">
              Page {page} of {totalPages} · {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 w-8 p-0 rounded-lg dark:border-[#2a2d3e] dark:text-stone-300 dark:hover:bg-[#252837]"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <Button
                  key={n}
                  variant={page === n ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPage(n)}
                  className={cn(
                    "h-8 w-8 p-0 rounded-lg text-sm font-bold",
                    page === n
                      ? "bg-[#1e2433] text-white hover:bg-[#2a3650]"
                      : "text-stone-500 dark:text-stone-400 dark:hover:bg-[#252837]",
                  )}
                >
                  {n}
                </Button>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-8 w-8 p-0 rounded-lg dark:border-[#2a2d3e] dark:text-stone-300 dark:hover:bg-[#252837]"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
