"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  X,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Flag,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getAdminReports,
  setAdminReportStatus,
  type AdminReportRecord,
} from "@/services/adminReportsService";

type ReportStatus = "PENDING" | "RESOLVED" | "DISMISSED";
type ReportTarget = "LISTING" | "USER";

interface AdminReport {
  id: string;
  reporter: string;
  target_type: ReportTarget;
  target_name: string;
  target_id: string;
  listing_owner: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const REPORTS: AdminReport[] = [];

const STATUS_CONFIG: Record<ReportStatus, { cls: string; label: string }> = {
  PENDING: {
    cls: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    label: "Pending",
  },
  RESOLVED: {
    cls: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
    label: "Resolved",
  },
  DISMISSED: {
    cls: "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400",
    label: "Dismissed",
  },
};

export default function ReportsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [reports, setReports] = useState<AdminReport[]>(REPORTS);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadReports = async () => {
      setLoadingReports(true);
      try {
        const data = await getAdminReports();
        if (!mounted) return;
        setReports((data ?? []) as AdminReportRecord[]);
      } catch (err) {
        if (!mounted) return;
        const message = typeof err === "string" ? err : "Failed to load reports";
        toast.error(message, { position: "top-center" });
      } finally {
        if (mounted) setLoadingReports(false);
      }
    };

    void loadReports();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    let data = [...reports];
    if (search)
      data = data.filter(
        (r) =>
          r.reporter.toLowerCase().includes(search.toLowerCase()) ||
          r.target_name.toLowerCase().includes(search.toLowerCase()) ||
          r.reason.toLowerCase().includes(search.toLowerCase()),
      );
    if (statusFilter !== "ALL")
      data = data.filter((r) => r.status === statusFilter);
    return data;
  }, [reports, search, statusFilter]);

  const pendingCount = reports.filter((r) => r.status === "PENDING").length;
  const resolvedCount = reports.filter((r) => r.status === "RESOLVED").length;
  const dismissedCount = reports.filter((r) => r.status === "DISMISSED").length;

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

  async function handleAction(id: string, action: "RESOLVED" | "DISMISSED") {
    setActionLoadingId(id);
    try {
      await setAdminReportStatus(id, action);
      setReports((rs) =>
        rs.map((r) =>
          r.id === id
            ? {
                ...r,
                status: action,
                reviewed_at: new Date().toISOString(),
                reviewed_by: r.reviewed_by ?? "Admin",
              }
            : r,
        ),
      );
      toast.success(`Report ${action === "RESOLVED" ? "resolved" : "dismissed"} successfully`, {
        position: "top-center",
      });
    } catch (err) {
      const message = typeof err === "string" ? err : "Failed to update report status";
      toast.error(message, { position: "top-center" });
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-50">
          Reports
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Pending",
            count: pendingCount,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-950/20",
            border: "border-amber-200 dark:border-amber-800",
            Icon: AlertTriangle,
          },
          {
            label: "Resolved",
            count: resolvedCount,
            color: "text-teal-600 dark:text-teal-400",
            bg: "bg-teal-50 dark:bg-teal-950/20",
            border: "border-teal-200 dark:border-teal-800",
            Icon: CheckCircle2,
          },
          {
            label: "Dismissed",
            count: dismissedCount,
            color: "text-stone-500 dark:text-stone-400",
            bg: "bg-stone-50 dark:bg-[#13151f]",
            border: "border-stone-200 dark:border-[#2a2d3e]",
            Icon: XCircle,
          },
        ].map(({ label, count, color, bg, border, Icon }) => (
          <div
            key={label}
            className={cn(
              "rounded-2xl border p-4 text-center cursor-pointer hover:shadow-sm transition-all",
              bg,
              border,
            )}
            onClick={() =>
              setStatusFilter((prev) =>
                prev === label.toUpperCase() ? "ALL" : label.toUpperCase(),
              )
            }
          >
            <Icon className={cn("w-5 h-5 mx-auto mb-1.5", color)} />
            <p className={cn("text-xl font-extrabold", color)}>{count}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reporter, listing, or reason…"
              className="w-full pl-9 pr-3 py-2.5 bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 outline-none focus:border-stone-400 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-7 pr-8 py-2.5 bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl text-sm text-stone-700 dark:text-stone-200 outline-none focus:border-stone-400 transition-colors appearance-none cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </select>
            </div>
            {(search || statusFilter !== "ALL") && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-2.5">
          {loadingReports
            ? "Loading reports..."
            : `${filtered.length} report${filtered.length !== 1 ? "s" : ""} found`}
        </p>
      </div>

      <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f]">
              <tr>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                  Reporter
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                  Reported Listing
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                  Listing Owner
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                  Reason
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">
                  Submitted
                </th>
                <th className="py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-[#2a2d3e]">
              {loadingReports ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-sm text-stone-400 dark:text-stone-500"
                  >
                    Loading reports...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-sm text-stone-400 dark:text-stone-500"
                  >
                    No reports match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((report) => (
                  <Fragment key={report.id}>
                    <tr
                      className="hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-[10px] font-bold text-stone-600 dark:text-stone-200 shrink-0">
                            {report.reporter.charAt(0)}
                          </div>
                          <span className="text-xs font-semibold text-stone-800 dark:text-stone-100 whitespace-nowrap">
                            {report.reporter}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-65">
                        {report.target_type === "LISTING" ? (
                          <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2">
                            {report.target_name}
                          </p>
                        ) : (
                          <span className="text-xs text-stone-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-stone-600 dark:text-stone-300 whitespace-nowrap">
                        {report.target_type === "LISTING" ? report.listing_owner : "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-[#13151f] px-2 py-0.5 rounded-lg">
                          <Flag className="w-2.5 h-2.5 text-red-400" /> {report.reason}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full",
                            STATUS_CONFIG[report.status].cls,
                          )}
                        >
                          {STATUS_CONFIG[report.status].label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
                        {formatDateTime(report.created_at)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {report.target_type === "LISTING" && (
                            <Link
                              href={`/listing/${report.target_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open listing"
                              aria-label="Open listing"
                              className="inline-flex items-center justify-center rounded-lg p-1.5 text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/30"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          )}
                          <button
                            type="button"
                            title={expandedRow === report.id ? "Hide Details" : "View Details"}
                            aria-label={expandedRow === report.id ? "Hide Details" : "View Details"}
                            onClick={() =>
                              setExpandedRow((prev) =>
                                prev === report.id ? null : report.id,
                              )
                            }
                            className="inline-flex items-center justify-center rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-[#252837]"
                            disabled={actionLoadingId === report.id}
                          >
                            {expandedRow === report.id ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          {report.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                title="Take Action"
                                aria-label="Take Action"
                                onClick={() =>
                                  void handleAction(report.id, "RESOLVED")
                                }
                                className="inline-flex items-center justify-center rounded-lg p-1.5 text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/30"
                                disabled={actionLoadingId === report.id}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Dismiss"
                                aria-label="Dismiss"
                                onClick={() =>
                                  void handleAction(report.id, "DISMISSED")
                                }
                                className="inline-flex items-center justify-center rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-[#252837]"
                                disabled={actionLoadingId === report.id}
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedRow === report.id && (
                      <tr
                        className="bg-stone-50 dark:bg-[#13151f]"
                      >
                        <td colSpan={7} className="px-4 py-4">
                          <div>
                            <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">
                              Report Description
                            </p>
                            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                              {report.description ?? (
                                <span className="italic text-stone-400">
                                  No additional description provided.
                                </span>
                              )}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
