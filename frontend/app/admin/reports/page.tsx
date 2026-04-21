"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  X,
  CheckCircle2,
  XCircle,
  Flag,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Eye,
  RotateCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ImageLink } from "@/components/image-link";
import {
  getAdminReports,
  setAdminReportAction,
} from "@/services/adminReportsService";

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
import { AdminReport, ReportStatus } from "@/types/admin";
import ReportActionsModal from "@/components/admin/report-actions-modal";
import { formatPrice } from "@/utils/string-builder";

type SortField = "reporter" | "listingOwner" | "reportedListing" | "submitted" | "reviewedAt";
type SortDir = "asc" | "desc";

const REPORTS: AdminReport[] = [];

const STATUS_CONFIG: Record<ReportStatus, { cls: string; label: string }> = {
  PENDING:   { cls: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",  label: "Pending"   },
  RESOLVED:  { cls: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",      label: "Resolved"  },
  DISMISSED: { cls: "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400",     label: "Dismissed" },
};

const REPORT_ACTION_REASON_MAX_LENGTH = 500;
const REPORT_ACTION_TYPES = new Set([
  "DISMISS",
  "BAN_LISTING",
  "LOCK_3",
  "LOCK_7",
  "LOCK_30",
  "DELETE_LISTING",
  "PERMANENT_BAN",
] as const);

// ── Shared filter select ───────────────────────────────────────────────────────
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
export default function ReportsPage() {
  const [search,          setSearch]          = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter,    setStatusFilter]    = useState("ALL");
  const [reasonFilter,    setReasonFilter]    = useState("ALL");
  const [sort,            setSort]            = useState<{ field: SortField; dir: SortDir }>({ field: "submitted", dir: "desc" });
  const [reports,         setReports]         = useState<AdminReport[]>(REPORTS);
  const [loadingReports,  setLoadingReports]  = useState(true);
  const [currentPage,     setCurrentPage]     = useState(1);
  const [totalCount,      setTotalCount]      = useState(0);
  const [isRefreshing,    setIsRefreshing]    = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [resolving,       setResolving]       = useState<AdminReport | null>(null);
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

  function toggleSort(field: SortField) {
    setCurrentPage(1);
    setSort(s => s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" });
  }

  // ── Load ──────────────────────────────────────────────────────────────────────
  const loadReports = useCallback(async (pageNumber: number) => {
    setLoadingReports(true);
    const nextOffset = (pageNumber - 1) * FETCH_LIMIT;

    try {
      const payload = await getAdminReports({
        search: debouncedSearch,
        status: statusFilter,
        reason: reasonFilter,
        limit: FETCH_LIMIT,
        offset: nextOffset,
      });

      const received = (payload.reports ?? []) as AdminReport[];
      setReports(received);
      setTotalCount(payload.total);
      setCurrentPage(pageNumber);
    } catch (err) {
      const message = typeof err === "string" ? err : "Failed to load reports";
      toast.error(message, { position: "top-center" });
    } finally {
      setLoadingReports(false);
      setIsRefreshing(false);
    }
  }, [debouncedSearch, statusFilter, reasonFilter]);

  useEffect(() => {
    void loadReports(currentPage);
  }, [currentPage, loadReports]);

  // ── Sort loaded chunk ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = [...reports];

    data.sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";

      if (sort.field === "reporter") {
        va = (a.reporter || "").toLowerCase();
        vb = (b.reporter || "").toLowerCase();
      } else if (sort.field === "listingOwner") {
        va = (a.listing_owner || "").toLowerCase();
        vb = (b.listing_owner || "").toLowerCase();
      } else if (sort.field === "reportedListing") {
        va = (a.target_name || "").toLowerCase();
        vb = (b.target_name || "").toLowerCase();
      } else if (sort.field === "reviewedAt") {
        va = a.reviewed_at ? new Date(a.reviewed_at).getTime() : 0;
        vb = b.reviewed_at ? new Date(b.reviewed_at).getTime() : 0;
      } else {
        va = a.created_at ? new Date(a.created_at).getTime() : 0;
        vb = b.created_at ? new Date(b.created_at).getTime() : 0;
      }

      if (typeof va === "string" && typeof vb === "string") {
        return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }

      return sort.dir === "asc"
        ? Number(va) - Number(vb)
        : Number(vb) - Number(va);
    });

    return data;
  }, [reports, sort]);

  const reasonOptions = useMemo(() => {
    const uniqueReasons = Array.from(new Set(reports.map(r => r.reason).filter(Boolean)));
    uniqueReasons.sort((a, b) => a.localeCompare(b));
    return uniqueReasons;
  }, [reports]);

  const pendingCount   = reports.filter(r => r.status === "PENDING").length;
  const resolvedCount  = reports.filter(r => r.status === "RESOLVED").length;
  const dismissedCount = reports.filter(r => r.status === "DISMISSED").length;

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function formatDateTime(value?: string | null): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" });
  }

  // ── Actions ───────────────────────────────────────────────────────────────────
  async function handleModalSubmit(id: string, action: "DISMISS" | "BAN_LISTING" | "LOCK_3" | "LOCK_7" | "LOCK_30" | "DELETE_LISTING" | "PERMANENT_BAN", reason: string) {
    const trimmedReason = reason.trim();
    if (!REPORT_ACTION_TYPES.has(action)) {
      toast.error("Invalid report action selected", { position: "top-center" });
      return;
    }
    if (trimmedReason.length === 0) {
      toast.error("Reason is required", { position: "top-center" });
      return;
    }
    if (trimmedReason.length > REPORT_ACTION_REASON_MAX_LENGTH) {
      toast.error(`Reason must not exceed ${REPORT_ACTION_REASON_MAX_LENGTH} characters`, { position: "top-center" });
      return;
    }

    setActionLoadingId(id);
    try {
      await setAdminReportAction(id, { action, reason: trimmedReason });
      const nowIso = new Date().toISOString();
      const nextStatus = action === "DISMISS" ? "DISMISSED" : "RESOLVED";
      setReports(rs =>
        rs.map(r =>
          r.id === id
            ? {
                ...r,
                status: nextStatus,
                action_taken: action,
                action_reason: trimmedReason,
                resolved_at: nowIso,
                reviewed_at: nowIso,
                resolved_by: r.resolved_by ?? "Admin",
                reviewed_by: r.reviewed_by ?? "Admin",
              }
            : r,
        ),
      );
      toast.success(
        "Report action submitted successfully",
        { position: "top-center" },
      );
      setResolving(null);
    } catch (err) {
      const message = typeof err === "string" ? err : "Failed to submit report action";
      toast.error(message, { position: "top-center" });
    } finally {
      setActionLoadingId(null);
    }
  }

  const hasActiveFilters = search || statusFilter !== "ALL" || reasonFilter !== "ALL";
  const totalPages = Math.max(1, Math.ceil(totalCount / FETCH_LIMIT));
  const paginationPages = useMemo(() => {
    const maxButtons = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  }, [currentPage, totalPages]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort.field !== field)
      return <ChevronsUpDown className="w-3 h-3 text-stone-300 dark:text-stone-600 ml-1" />;
    return sort.dir === "asc"
      ? <ChevronUp className="w-3 h-3 ml-1" />
      : <ChevronDown className="w-3 h-3 ml-1" />;
  };

  const SortableTH = ({ label, field }: { label: string; field: SortField }) => (
    <TableHead
      className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest cursor-pointer select-none hover:text-stone-700 dark:hover:text-stone-200 whitespace-nowrap"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIcon field={field} />
      </span>
    </TableHead>
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh)] p-5 sm:p-6 flex flex-col gap-5 min-h-0">

      {/* ── Page header ── */}
      {/* <div>
        <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-50">
          Reports
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          Review and act on user-submitted reports
        </p>
      </div> */}

      {/* ── Summary cards — clickable to filter by status ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total", count: totalCount,     status: "ALL",       color: "text-stone-700 dark:text-stone-200", Icon: Flag         },
          { label: "Pending",       count: pendingCount,   status: "PENDING",   color: "text-amber-600 dark:text-amber-400", Icon: AlertTriangle },
          { label: "Resolved",      count: resolvedCount,  status: "RESOLVED",  color: "text-teal-600 dark:text-teal-400",   Icon: CheckCircle2  },
          { label: "Dismissed",     count: dismissedCount, status: "DISMISSED", color: "text-stone-500 dark:text-stone-400", Icon: XCircle       },
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

      {/* ── Search + filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); }}
            placeholder="Search reporter, listing, or reason…"
            className="pl-9 dark:bg-[#13151f] dark:border-[#2a2d3e]"
          />
        </div>

        <div className="flex gap-2">
          {/* Reason filter */}
          <FilterSelect
            value={reasonFilter}
            onChange={v => { setReasonFilter(v); setCurrentPage(1); }}
            options={[
              ["ALL", "All Reasons"],
              ...reasonOptions.map(reason => [reason, reason] as [string, string]),
            ]}
          />

          {/* Status filter */}
          <FilterSelect
            value={statusFilter}
            onChange={v => { setStatusFilter(v); setCurrentPage(1); }}
            options={[
              ["ALL",       "All Status" ],
              ["PENDING",   "Pending"    ],
              ["RESOLVED",  "Resolved"   ],
              ["DISMISSED", "Dismissed"  ],
            ]}
          />

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={() => { setSearch(""); setReasonFilter("ALL"); setStatusFilter("ALL"); setCurrentPage(1); }}
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
            void loadReports(currentPage);
          }}
          disabled={loadingReports}
          className="border-sky-600 text-sky-600! hover:bg-sky-600/10 focus-visible:border-sky-600 focus-visible:ring-sky-600/20 dark:border-sky-400 dark:text-sky-400! dark:hover:bg-sky-400/10 dark:focus-visible:border-sky-400 dark:focus-visible:ring-sky-400/40"
        >
          <RotateCw className={cn("w-3.5 h-3.5", loadingReports && isRefreshing && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* ── Table ── */}
      <div className="relative flex-1 min-h-0">
        <Card className="p-0 rounded-lg dark:bg-[#1c1f2e] dark:border-[#2a2d3e] overflow-hidden h-full min-h-0">
          <CardContent className="p-0 h-full min-h-0 flex flex-col">
            <div className="overflow-auto h-full">
              <Table>
                <TableHeader>
                  <TableRow className="border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f] hover:bg-stone-50 dark:hover:bg-[#13151f]">
                      <SortableTH label="Reporter" field="reporter" />
                      <SortableTH label="Reported User" field="listingOwner" />
                      <SortableTH label="Reported Listing" field="reportedListing" />
                    <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                      Reason
                    </TableHead>
                    <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                      Status
                    </TableHead>
                      <SortableTH label="Submitted" field="submitted" />
                    <SortableTH label="Reviewer" field="reviewedAt" />
                    <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                      Action Taken
                    </TableHead>
                    <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loadingReports && filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">
                        Loading reports…
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">
                        No reports match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(report => (
                      <Fragment key={report.id}>
                        {/* ── Main row ── */}
                        <TableRow className="border-stone-100 dark:border-[#2a2d3e] hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors">

                          {/* Reporter */}
                          <TableCell className="py-3.5">
                            <div className="flex items-center gap-2.5">
                              <ImageLink
                                href={`/profile?userId=${report.reporter_id}`}
                                newTab
                                src={report.reporter_profile_image_url}
                                type="profile"
                                label={report.reporter}
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 whitespace-nowrap truncate">
                                  {report.reporter}
                                </p>
                                <p className="text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap truncate">
                                  {report.reporter_location || "-"}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          {/* Listing owner */}
                          <TableCell className="py-3.5 text-sm text-stone-600 dark:text-stone-300 whitespace-nowrap">
                            {report.target_type === "LISTING" ? (
                              <div className="flex items-center gap-2.5">
                                <ImageLink
                                  href={`/profile?userId=${report.listing_owner_id}`}
                                  newTab
                                  src={report.listing_owner_profile_image_url}
                                  type="profile"
                                  label={report.listing_owner}
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 whitespace-nowrap truncate">
                                    {report.listing_owner}
                                  </p>
                                  <p className="text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap truncate">
                                    {report.listing_owner_location || "-"}
                                  </p>
                                </div>
                              </div>
                            ) : "—"}
                          </TableCell>

                          {/* Reported listing */}
                          <TableCell className="py-3.5 max-w-65">
                            {report.target_type === "LISTING" ? (
                              <div className="flex items-center gap-2.5 min-w-0">
                                <ImageLink
                                  href={`/listing/${report.target_id}`}
                                  newTab
                                  src={report.listing_image_url}
                                  type="thumbnail"
                                  label={report.target_name}
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 truncate">
                                    {report.target_name}
                                  </p>
                                  <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                                    {formatPrice(report.listing_price ?? 0)} {report.listing_price_unit}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-stone-400">—</span>
                            )}
                          </TableCell>

                          {/* Reason */}
                          <TableCell className="py-3.5">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-[#13151f] px-2 py-0.5 rounded-lg">
                              <Flag className="w-2.5 h-2.5 text-red-400 shrink-0" />
                              {report.reason}
                            </span>
                          </TableCell>

                          {/* Status badge */}
                          <TableCell className="py-3.5 whitespace-nowrap">
                            <span className={cn(
                              "text-xs font-bold px-2 py-0.5 rounded-md",
                              STATUS_CONFIG[report.status].cls,
                            )}>
                              {STATUS_CONFIG[report.status].label}
                            </span>
                          </TableCell>

                          {/* Submitted date */}
                          <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                            {formatDateTime(report.created_at)}
                          </TableCell>

                          {/* Reviewer */}
                          <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                            {report.reviewed_by
                              ? (
                                <div>
                                  <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{report.reviewed_by}</p>
                                  <p className="text-xs text-stone-400 dark:text-stone-500">{formatDateTime(report.reviewed_at)}</p>
                                </div>
                              ) : <span className="text-stone-300 dark:text-stone-600">—</span>
                            }
                          </TableCell>

                          {/* Action Taken */}
                          <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                            {report.action_taken
                              ? report.action_taken.replaceAll("_", " ")
                              : <span className="text-stone-300 dark:text-stone-600">—</span>
                            }
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-3.5">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                type="button"
                                size="icon"
                                onClick={() => setResolving(report)}
                                disabled={actionLoadingId === report.id}
                                className="w-7 h-7 text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-[#252837]"
                            >
                              <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    ))
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
                  disabled={loadingReports || currentPage <= 1}
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
                    disabled={loadingReports}
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
                  disabled={loadingReports || currentPage >= totalPages}
                  className="h-8 px-2.5"
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {resolving && (
        <ReportActionsModal
          report={resolving}
          onClose={() => setResolving(null)}
          onSubmit={handleModalSubmit}
        />
      )}
    </div>
  );
}
