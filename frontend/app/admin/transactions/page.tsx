"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Clock,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Handshake,
  X,
  ShoppingBag,
  Home,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getAdminTransactions,
  type AdminTransactionRecord,
} from "@/services/adminTransactionsService";

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
type ListingType = "SELL" | "RENT" | "SERVICE";
type TransactionStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
type SortField = "totalPrice" | "completedAt" | "createdAt";
type SortDir       = "asc" | "desc";

interface AdminTransaction extends AdminTransactionRecord {}

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

const STATUS_CONFIG: Record<TransactionStatus, string> = {
  PENDING: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  CONFIRMED: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  COMPLETED: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
  CANCELLED: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300",
};

const phpFmt = new Intl.NumberFormat("en-PH", {
  style:                 "currency",
  currency:              "PHP",
  minimumFractionDigits: 0,
});

function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start || !end) return "N/A";
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "N/A";
  return `${s.toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" })} - ${e.toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" })}`;
}

function buildScheduleUnitsLabel(tx: AdminTransaction): string {
  const units = Math.max(1, Number(tx.schedule_units || 1));
  if (tx.listing_type === "SELL") {
    return `${units} ${units === 1 ? "unit" : "units"}`;
  }
  return `${units} ${units === 1 ? "day" : "days"}`;
}

function Avatar({ src, alt }: { src?: string; alt: string }) {
  return <img
    src={src || "/profile-icon.png"}
    alt={alt}
    className="w-9 h-9 rounded-full object-cover border border-border shrink-0"
  />;
}

function DealStateRow({ label, agreed }: { label: string; agreed: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {agreed 
        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        : <XCircle className="w-4 h-4 text-amber-500 shrink-0" />
      }
      <span className={cn("text-xs", agreed ? "text-emerald-600 dark:text-emerald-300" : "text-amber-600 dark:text-amber-300")}>
        {label}: {agreed ? "Agreed" : "Pending"}
      </span>
    </div>
  );
}

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
export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: "createdAt", dir: "desc" });
  const [page, setPage] = useState(1);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const PER_PAGE = 8;

  // ── Load ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const loadTransactions = async () => {
      setLoadingTransactions(true);
      try {
        const data = await getAdminTransactions();
        if (!mounted) return;
        setTransactions((data ?? []) as AdminTransaction[]);
      } catch (err) {
        if (!mounted) return;
        const message = typeof err === "string" ? err : "Failed to load transactions";
        toast.error(message, { position: "top-center" });
      } finally {
        if (mounted) setLoadingTransactions(false);
      }
    };
    void loadTransactions();
    return () => { mounted = false; };
  }, []);

  // ── Sort ──────────────────────────────────────────────────────────────────────
  function toggleSort(field: SortField) {
    setSort(s => s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: "desc" });
    setPage(1);
  }

  // ── Filter + sort + paginate ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = [...transactions];
    const searchLower = search.trim().toLowerCase();
    if (search)
      data = data.filter(tx =>
        tx.listing_title.toLowerCase().includes(searchLower)
        || tx.client_full_name.toLowerCase().includes(searchLower)
        || tx.owner_full_name.toLowerCase().includes(searchLower),
      );
    if (typeFilter !== "ALL") data = data.filter(tx => tx.listing_type === typeFilter);
    if (statusFilter !== "ALL") data = data.filter(tx => tx.status === statusFilter);
    data.sort((a, b) => {
      let va = 0;
      let vb = 0;
      if (sort.field === "totalPrice") {
        va = Number(a.total_price) || 0;
        vb = Number(b.total_price) || 0;
      } else if (sort.field === "completedAt") {
        va = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        vb = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      } else {
        va = new Date(a.created_at).getTime();
        vb = new Date(b.created_at).getTime();
      }
      return sort.dir === "asc" ? va - vb : vb - va;
    });
    return data;
  }, [transactions, search, typeFilter, statusFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged      = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const totalCount     = transactions.length;
  const pendingCount   = transactions.filter(tx => tx.status === "PENDING").length;
  const confirmedCount = transactions.filter(tx => tx.status === "CONFIRMED").length;
  const completedCount = transactions.filter(tx => tx.status === "COMPLETED").length;
  const cancelledCount = transactions.filter(tx => tx.status === "CANCELLED").length;

  const hasActiveFilters = search || typeFilter !== "ALL" || statusFilter !== "ALL";

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
          Transactions
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          Monitor all listing transactions across selling, renting, and service listings.
        </p>
      </div>

      {/* ── Summary cards — clickable to filter by status ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {[
          { label: "Total Transactions",     count: totalCount,     status: "ALL",       color: "text-stone-700 dark:text-stone-200", bg: "bg-stone-100 dark:bg-[#13151f]",     border: "border-stone-200 dark:border-[#2a2d3e]", Icon: Handshake   },
          { label: "Pending",   count: pendingCount,   status: "PENDING",   color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/20",  border: "border-amber-200 dark:border-amber-800",  Icon: Clock       },
          { label: "Confirmed", count: confirmedCount, status: "CONFIRMED", color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-950/20",    border: "border-blue-200 dark:border-blue-800",    Icon: Handshake   },
          { label: "Completed", count: completedCount, status: "COMPLETED", color: "text-teal-600 dark:text-teal-400",   bg: "bg-teal-50 dark:bg-teal-950/20",    border: "border-teal-200 dark:border-teal-800",    Icon: CheckCircle2 },
          { label: "Cancelled", count: cancelledCount, status: "CANCELLED", color: "text-red-600 dark:text-red-400",     bg: "bg-red-50 dark:bg-red-950/20",      border: "border-red-200 dark:border-red-800",      Icon: XCircle     },
        ].map(({ label, count, status, color, bg, border, Icon }) => (
          <Card
            key={label}
            className={cn(
              "rounded-lg cursor-pointer hover:shadow-sm transition-all border",
              bg, border,
              statusFilter === status && "ring-2 ring-offset-1 ring-current",
            )}
            onClick={() => {
              setStatusFilter(prev => {
                if (status === "ALL") return "ALL";
                return prev === status ? "ALL" : status;
              });
              setPage(1);
            }}
          >
            <CardContent className="text-center">
              <Icon className={cn("w-5 h-5 mx-auto mb-1.5", color)} />
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
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search listing, client, or owner…"
            className="pl-9 dark:bg-[#13151f] dark:border-[#2a2d3e]"
          />
        </div>

        {/* Filter selects */}
        <div className="flex gap-2 flex-wrap">
          <FilterSelect
            value={typeFilter}
            onChange={v => { setTypeFilter(v); setPage(1); }}
            options={[
              ["ALL", "All Types"],
              ["SELL", "For Sale"],
              ["RENT", "For Rent"],
              ["SERVICE", "Service"],
            ]}
          />
          <FilterSelect
            value={statusFilter}
            onChange={v => { setStatusFilter(v); setPage(1); }}
            options={[
              ["ALL", "All Status"],
              ["PENDING", "Pending"],
              ["CONFIRMED", "Confirmed"],
              ["COMPLETED", "Completed"],
              ["CANCELLED", "Cancelled"],
            ]}
          />

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch(""); setTypeFilter("ALL");
                setStatusFilter("ALL");
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
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Client
                  </TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Listing Owner
                  </TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Listing
                  </TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Schedule
                  </TableHead>
                  <SortableTH label="Total" field="totalPrice" />
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Agreement
                  </TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                    Status
                  </TableHead>
                  <SortableTH label="Completed" field="completedAt" />
                  <SortableTH label="Created" field="createdAt" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {loadingTransactions ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">
                      Loading transactions...
                    </TableCell>
                  </TableRow>
                ) : paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">
                      No transactions match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map(transaction => {
                    const typeConfig = TYPE_CONFIG[transaction.listing_type];
                    const TypeIcon = typeConfig.Icon;
                    return (
                      <TableRow
                        key={transaction.id}
                        className="border-stone-100 dark:border-[#2a2d3e] hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors"
                      >

                        {/* Client */}
                        <TableCell className="py-3.5 min-w-55">
                          <div className="flex items-center gap-2.5">
                            <Link href={`/profile?userId=${transaction.client_user_id}`} target="_blank" rel="noopener noreferrer" title="Open client profile" className="shrink-0">
                              <Avatar
                                src={transaction.client_profile_image_url}
                                alt={transaction.client_full_name}
                              />
                            </Link>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-stone-800 dark:text-stone-100 truncate">{transaction.client_full_name}</p>
                              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{transaction.client_location || "-"}</p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Owner */}
                        <TableCell className="py-3.5 min-w-55">
                          <div className="flex items-center gap-2.5">
                            <Link href={`/profile?userId=${transaction.owner_user_id}`} target="_blank" rel="noopener noreferrer" title="Open owner profile" className="shrink-0">
                              <Avatar
                                src={transaction.owner_profile_image_url}
                                alt={transaction.owner_full_name}
                              />
                            </Link>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-stone-800 dark:text-stone-100 truncate">{transaction.owner_full_name}</p>
                              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{transaction.owner_location || "-"}</p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Listing */}
                        <TableCell className="py-3.5 min-w-65">
                          <div className="flex items-center gap-2.5">
                            <Link href={`/listing/${transaction.listing_id}`} target="_blank" rel="noopener noreferrer" title="Open listing" className="shrink-0">
                              {transaction.listing_image_url ? (
                                <img src={transaction.listing_image_url} alt={transaction.listing_title} className="w-10 h-10 rounded-md object-cover border border-border shrink-0" />
                              ) : (
                                <div className="w-12 h-12 rounded-md bg-stone-200 dark:bg-[#2a2d3e] border border-border flex items-center justify-center shrink-0">📦</div>
                              )}
                            </Link>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-stone-800 dark:text-stone-100 truncate">{transaction.listing_title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={cn("inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full", typeConfig.cls)}>
                                  <TypeIcon className="w-2.5 h-2.5" /> {typeConfig.label}
                                </span>
                                <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{phpFmt.format(transaction.total_price)} / {transaction.listing_price_unit || "unit"}</p>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Schedule */}
                        <TableCell className="py-3.5 min-w-57.5 whitespace-nowrap">
                          <p className="text-sm text-stone-800 dark:text-stone-100">{formatDateRange(transaction.start_date, transaction.end_date)}</p>
                          <p className="text-xs text-stone-500 dark:text-stone-400">{transaction.selected_time_window || "N/A"}</p>
                        </TableCell>

                        {/* Total Price */}
                        <TableCell className="py-3.5 min-w-37.5 whitespace-nowrap">
                          <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{phpFmt.format(transaction.total_price)}</p>
                          <p className="text-xs text-stone-500 dark:text-stone-400">{buildScheduleUnitsLabel(transaction)}</p>
                        </TableCell>

                        {/* Agreement */}
                        <TableCell className="py-3.5 min-w-45 space-y-1.5">
                          <DealStateRow label="Owner" agreed={Boolean(transaction.provider_agreed)} />
                          <DealStateRow label="Client" agreed={Boolean(transaction.client_agreed)} />
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3.5 whitespace-nowrap">
                          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", STATUS_CONFIG[transaction.status])}>
                            {transaction.status.charAt(0) + transaction.status.slice(1).toLowerCase()}
                          </span>
                        </TableCell>

                        {/* Completed At */}
                        <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                          {formatDateTime(transaction.completed_at)}
                        </TableCell>

                        {/* Created At */}
                        <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                          {formatDateTime(transaction.created_at)}
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
