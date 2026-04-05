"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  X,
  CheckCircle2,
  XCircle,
  Flag,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { validateImageURL } from "@/utils/validation";
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

const REPORTS: AdminReport[] = [];

const STATUS_CONFIG: Record<ReportStatus, { cls: string; label: string }> = {
  PENDING:   { cls: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",  label: "Pending"   },
  RESOLVED:  { cls: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",      label: "Resolved"  },
  DISMISSED: { cls: "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400",     label: "Dismissed" },
};

const phpFmt = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
});

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
export default function ReportsPage() {
  const [search,         setSearch]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState("ALL");
  const [page,           setPage]           = useState(1);
  const [reports,        setReports]        = useState<AdminReport[]>(REPORTS);
  const [loadingReports, setLoadingReports] = useState(true);
  const [actionLoadingId,setActionLoadingId]= useState<string | null>(null);
  const [resolving,      setResolving]      = useState<AdminReport | null>(null);
  const PER_PAGE = 8;

  // ── Load ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const loadReports = async () => {
      setLoadingReports(true);
      try {
        const data = await getAdminReports();
        if (!mounted) return;
        setReports((data ?? []) as AdminReport[]);
      } catch (err) {
        if (!mounted) return;
        const message = typeof err === "string" ? err : "Failed to load reports";
        toast.error(message, { position: "top-center" });
      } finally {
        if (mounted) setLoadingReports(false);
      }
    };
    void loadReports();
    return () => { mounted = false; };
  }, []);

  // ── Filter + paginate ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = [...reports];
    if (search)
      data = data.filter(r =>
        r.reporter.toLowerCase().includes(search.toLowerCase()) ||
        r.target_name.toLowerCase().includes(search.toLowerCase()) ||
        r.reason.toLowerCase().includes(search.toLowerCase()),
      );
    if (statusFilter !== "ALL") data = data.filter(r => r.status === statusFilter);
    return data;
  }, [reports, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged      = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const totalCount     = reports.length;
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
    setActionLoadingId(id);
    try {
      await setAdminReportAction(id, { action, reason });
      const nowIso = new Date().toISOString();
      const nextStatus = action === "DISMISS" ? "DISMISSED" : "RESOLVED";
      setReports(rs =>
        rs.map(r =>
          r.id === id
            ? {
                ...r,
                status: nextStatus,
                action_taken: action,
                action_reason: reason,
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

  const hasActiveFilters = search || statusFilter !== "ALL";

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 sm:p-6 space-y-5">

      {/* ── Page header ── */}
      <div>
        <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-50">
          Reports
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          Review and act on user-submitted reports
        </p>
      </div>

      {/* ── Summary cards — clickable to filter by status ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Reports", count: totalCount,     status: "ALL",       color: "text-stone-700 dark:text-stone-200", bg: "bg-stone-100 dark:bg-[#13151f]",     border: "border-stone-200 dark:border-[#2a2d3e]", Icon: Flag         },
          { label: "Pending",       count: pendingCount,   status: "PENDING",   color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/20",  border: "border-amber-200 dark:border-amber-800",  Icon: AlertTriangle },
          { label: "Resolved",      count: resolvedCount,  status: "RESOLVED",  color: "text-teal-600 dark:text-teal-400",   bg: "bg-teal-50 dark:bg-teal-950/20",    border: "border-teal-200 dark:border-teal-800",    Icon: CheckCircle2  },
          { label: "Dismissed",     count: dismissedCount, status: "DISMISSED", color: "text-stone-500 dark:text-stone-400", bg: "bg-stone-50 dark:bg-[#13151f]",     border: "border-stone-200 dark:border-[#2a2d3e]", Icon: XCircle       },
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

      {/* ── Search + filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search reporter, listing, or reason…"
            className="pl-9 dark:bg-[#13151f] dark:border-[#2a2d3e]"
          />
        </div>

        <div className="flex gap-2">
          {/* Status filter */}
          <FilterSelect
            value={statusFilter}
            onChange={v => { setStatusFilter(v); setPage(1); }}
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
              size="sm"
              onClick={() => { setSearch(""); setStatusFilter("ALL"); setPage(1); }}
              className="gap-1.5 border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 hover:border-red-300"
            >
              <X className="w-3 h-3" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="relative">
        <Card className="p-0 rounded-lg dark:bg-[#1c1f2e] dark:border-[#2a2d3e] overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f] hover:bg-stone-50 dark:hover:bg-[#13151f]">
                    <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                      Reporter
                    </TableHead>
                    <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Listing Owner</TableHead>
                    <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                      Reported Listing
                    </TableHead>
                    <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                      Reason
                    </TableHead>
                    <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                      Submitted
                    </TableHead>
                    <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loadingReports ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">
                        Loading reports…
                      </TableCell>
                    </TableRow>
                  ) : paged.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">
                        No reports match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paged.map(report => (
                      <Fragment key={report.id}>
                        {/* ── Main row ── */}
                        <TableRow className="border-stone-100 dark:border-[#2a2d3e] hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors">

                          {/* Reporter */}
                          <TableCell className="py-3.5">
                            <div className="flex items-center gap-2.5">
                              <Link
                                href={`/profile?userId=${report.reporter_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open reporter profile"
                                aria-label="Open reporter profile"
                                className="shrink-0"
                              >
                                <Image
                                  src={validateImageURL(report.reporter_profile_image_url) || "/profile-icon.png"}
                                  alt="Profile"
                                  width={32}
                                  height={32}
                                  className="w-9 h-9 rounded-full object-cover border border-stone-200 dark:border-[#2a2d3e] shrink-0"
                                />
                              </Link>
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
                                <Link
                                  href={`/profile?userId=${report.listing_owner_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Open listing owner profile"
                                  aria-label="Open listing owner profile"
                                  className="shrink-0"
                                >
                                  <Image
                                    src={validateImageURL(report.listing_owner_profile_image_url) || "/profile-icon.png"}
                                    alt="Profile"
                                    width={32}
                                    height={32}
                                    className="w-9 h-9 rounded-full object-cover border border-stone-200 dark:border-[#2a2d3e] shrink-0"
                                  />
                                </Link>
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
                                <Link
                                  href={`/listing/${report.target_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Open listing"
                                  aria-label="Open listing"
                                  className="shrink-0"
                                >
                                  <Image
                                    src={validateImageURL(report.listing_image_url) || "/logo.png"}
                                    alt={report.target_name}
                                    width={40}
                                    height={40}
                                    className="w-10 h-10 rounded-md object-cover border border-stone-200 dark:border-[#2a2d3e] shrink-0"
                                  />
                                </Link>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 truncate">
                                    {report.target_name}
                                  </p>
                                  <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                                    {phpFmt.format(report.listing_price ?? 0)} / {report.listing_price_unit || "unit"}
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
                              "text-xs font-bold px-2 py-0.5 rounded-full",
                              STATUS_CONFIG[report.status].cls,
                            )}>
                              {STATUS_CONFIG[report.status].label}
                            </span>
                          </TableCell>

                          {/* Submitted date */}
                          <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                            {formatDateTime(report.created_at)}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-3.5">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant={report.status === "PENDING" ? "default" : "outline"}
                                onClick={() => setResolving(report)}
                                disabled={actionLoadingId === report.id}
                                className={cn(
                                  "h-8 rounded-lg",
                                  report.status === "PENDING"
                                    ? "bg-[#1e2433] text-white hover:bg-[#2a3650]"
                                    : "dark:border-[#2a2d3e] dark:text-stone-300 dark:hover:bg-[#252837]"
                                )}
                              >
                                {report.status === "PENDING" ? "Take Action" : "View Resolution"}
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
