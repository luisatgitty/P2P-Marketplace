"use client";

import { useState, useMemo } from "react";
import {
  Search, Filter, X, CheckCircle2, XCircle, ExternalLink,
  Flag, User, Package, AlertTriangle, Eye, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ReportStatus = "PENDING" | "RESOLVED" | "DISMISSED";
type ReportTarget = "LISTING" | "USER";

interface AdminReport {
  id:          string;
  reporter:    string;
  target_type: ReportTarget;
  target_name: string;
  target_id:   string;
  reason:      string;
  description: string | null;
  status:      ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at:  string;
}

const REPORTS: AdminReport[] = [
  { id:"r1",  reporter:"Juan dela Cruz",   target_type:"LISTING", target_name:"iPhone 16 Pro — suspiciously cheap",    target_id:"l99", reason:"Scam / Fraud",          description:"Seller is asking for GCash payment before meetup. Price is way below market. Suspect scam.",                                                    status:"PENDING",   reviewed_by:null,          reviewed_at:null,           created_at:"Mar 19, 2026 · 9:14 AM" },
  { id:"r2",  reporter:"Maria Santos",     target_type:"USER",    target_name:"fake_seller_99",                        target_id:"u99", reason:"Fake Account",           description:"This account has no profile photo, bio, or verified contact. All listings are copy-pasted from other sellers.",                                   status:"PENDING",   reviewed_by:null,          reviewed_at:null,           created_at:"Mar 19, 2026 · 6:30 AM" },
  { id:"r3",  reporter:"Pedro Reyes",      target_type:"LISTING", target_name:"Honda Beat Street — photos mismatched", target_id:"l2",  reason:"Misleading Information", description:"The photos shown are from the internet, not the actual unit. I saw the same photos on another listing posted last year.",                         status:"PENDING",   reviewed_by:null,          reviewed_at:null,           created_at:"Mar 18, 2026 · 5:00 PM" },
  { id:"r4",  reporter:"Ana Bautista",     target_type:"LISTING", target_name:"Studio Unit — Makati CBD",              target_id:"l4",  reason:"Prohibited Item",        description:"This looks like the listing is for an illegal sublet. The building has an agreement against short-term subletting.",                            status:"RESOLVED",  reviewed_by:"Admin One",   reviewed_at:"Mar 18, 2026", created_at:"Mar 17, 2026 · 11:00 AM" },
  { id:"r5",  reporter:"Carlos Mendoza",   target_type:"LISTING", target_name:"Aircon Cleaning — duplicate listing",   target_id:"l7",  reason:"Spam / Duplicate",       description:"This seller has 4 identical listings for the same service with slightly different titles.",                                                     status:"DISMISSED", reviewed_by:"Admin One",   reviewed_at:"Mar 17, 2026", created_at:"Mar 16, 2026 · 2:45 PM" },
  { id:"r6",  reporter:"Rowena Pascual",   target_type:"USER",    target_name:"jerome.d.user",                        target_id:"u11", reason:"Harassment",             description:"This user sent me threatening messages after I declined their offer. I have screenshots.",                                                        status:"PENDING",   reviewed_by:null,          reviewed_at:null,           created_at:"Mar 16, 2026 · 9:00 AM" },
  { id:"r7",  reporter:"Cynthia Lim",      target_type:"LISTING", target_name:"MacBook Pro M2 — sold as is",           target_id:"l3",  reason:"Counterfeit / Fake",     description:"The serial number on this MacBook doesn't match any Apple registration. Seller refuses to show purchase receipt.",                              status:"PENDING",   reviewed_by:null,          reviewed_at:null,           created_at:"Mar 15, 2026 · 3:20 PM" },
  { id:"r8",  reporter:"Ramon Torres",     target_type:"LISTING", target_name:"Event Tables & Chairs",                target_id:"l12", reason:"Wrong Category",         description:"This should be under Equipment & Tools not Event Venues. Misleading placement.",                                                               status:"RESOLVED",  reviewed_by:"Admin One",   reviewed_at:"Mar 14, 2026", created_at:"Mar 14, 2026 · 8:00 AM" },
];

const STATUS_CONFIG: Record<ReportStatus, { cls: string; label: string }> = {
  PENDING:   { cls:"bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",  label:"Pending"   },
  RESOLVED:  { cls:"bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",      label:"Resolved"  },
  DISMISSED: { cls:"bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400",     label:"Dismissed" },
};

export default function ReportsPage() {
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter,   setTypeFilter]   = useState("ALL");
  const [selected,     setSelected]     = useState<AdminReport | null>(null);
  const [reports,      setReports]      = useState<AdminReport[]>(REPORTS);
  const [expandedRow,  setExpandedRow]  = useState<string | null>(null);

  const filtered = useMemo(() => {
    let data = [...reports];
    if (search)             data = data.filter(r => r.reporter.toLowerCase().includes(search.toLowerCase()) || r.target_name.toLowerCase().includes(search.toLowerCase()) || r.reason.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== "ALL") data = data.filter(r => r.status      === statusFilter);
    if (typeFilter   !== "ALL") data = data.filter(r => r.target_type === typeFilter);
    return data;
  }, [reports, search, statusFilter, typeFilter]);

  const pendingCount   = reports.filter(r => r.status === "PENDING").length;
  const resolvedCount  = reports.filter(r => r.status === "RESOLVED").length;
  const dismissedCount = reports.filter(r => r.status === "DISMISSED").length;

  function handleAction(id: string, action: "RESOLVED" | "DISMISSED") {
    setReports(rs => rs.map(r => r.id === id
      ? { ...r, status: action, reviewed_by: "Admin One", reviewed_at: "Mar 19, 2026" }
      : r
    ));
    setSelected(null);
  }

  return (
    <div className="p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-50">Reports</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Review and act on user-submitted reports</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:"Pending",   count:pendingCount,   color:"text-amber-600 dark:text-amber-400", bg:"bg-amber-50 dark:bg-amber-950/20",  border:"border-amber-200 dark:border-amber-800",  Icon:AlertTriangle },
          { label:"Resolved",  count:resolvedCount,  color:"text-teal-600 dark:text-teal-400",   bg:"bg-teal-50 dark:bg-teal-950/20",    border:"border-teal-200 dark:border-teal-800",    Icon:CheckCircle2  },
          { label:"Dismissed", count:dismissedCount, color:"text-stone-500 dark:text-stone-400", bg:"bg-stone-50 dark:bg-[#13151f]",     border:"border-stone-200 dark:border-[#2a2d3e]", Icon:XCircle       },
        ].map(({ label, count, color, bg, border, Icon }) => (
          <div key={label} className={cn("rounded-2xl border p-4 text-center cursor-pointer hover:shadow-sm transition-all", bg, border)}
            onClick={() => setStatusFilter(prev => prev === label.toUpperCase() ? "ALL" : label.toUpperCase())}>
            <Icon className={cn("w-5 h-5 mx-auto mb-1.5", color)} />
            <p className={cn("text-xl font-extrabold", color)}>{count}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reporter, target, or reason…"
              className="w-full pl-9 pr-3 py-2.5 bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 outline-none focus:border-stone-400 transition-colors" />
          </div>
          <div className="flex gap-2">
            {[
              { value: statusFilter, setter: setStatusFilter, options: [["ALL","All Status"],["PENDING","Pending"],["RESOLVED","Resolved"],["DISMISSED","Dismissed"]] },
              { value: typeFilter,   setter: setTypeFilter,   options: [["ALL","All Targets"],["LISTING","Listings"],["USER","Users"]] },
            ].map(({ value, setter, options }, i) => (
              <div key={i} className="relative">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
                <select value={value} onChange={e => setter(e.target.value)}
                  className="pl-7 pr-8 py-2.5 bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl text-sm text-stone-700 dark:text-stone-200 outline-none focus:border-stone-400 transition-colors appearance-none cursor-pointer">
                  {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
            {(search || statusFilter !== "ALL" || typeFilter !== "ALL") && (
              <button onClick={() => { setSearch(""); setStatusFilter("ALL"); setTypeFilter("ALL"); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-2.5">{filtered.length} report{filtered.length !== 1 ? "s" : ""} found</p>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f]">
              <tr>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Reporter</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Target</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Reason</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Status</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">Submitted</th>
                <th className="py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-[#2a2d3e]">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">No reports match the current filters.</td></tr>
              ) : filtered.map(report => (
                <>
                  <tr key={report.id} className="hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-[10px] font-bold text-stone-600 dark:text-stone-200 flex-shrink-0">
                          {report.reporter.charAt(0)}
                        </div>
                        <span className="text-xs font-semibold text-stone-800 dark:text-stone-100 whitespace-nowrap">{report.reporter}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {report.target_type === "LISTING"
                          ? <Package className="w-3 h-3 text-teal-500 flex-shrink-0" />
                          : <User    className="w-3 h-3 text-blue-500 flex-shrink-0" />
                        }
                        <span className="text-xs text-stone-600 dark:text-stone-300 truncate max-w-[160px]">{report.target_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-[#13151f] px-2 py-0.5 rounded-lg">
                        <Flag className="w-2.5 h-2.5 text-red-400" /> {report.reason}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", STATUS_CONFIG[report.status].cls)}>
                        {STATUS_CONFIG[report.status].label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">{report.created_at}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setExpandedRow(prev => prev === report.id ? null : report.id)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 transition-colors px-2 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-[#252837]"
                        >
                          <Eye className="w-3 h-3" />
                          Details
                          <ChevronDown className={cn("w-3 h-3 transition-transform", expandedRow === report.id && "rotate-180")} />
                        </button>
                        {report.status === "PENDING" && (
                          <>
                            <button onClick={() => handleAction(report.id, "RESOLVED")}
                              className="flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 px-2 py-1 rounded-lg transition-colors">
                              <CheckCircle2 className="w-3 h-3" /> Resolve
                            </button>
                            <button onClick={() => handleAction(report.id, "DISMISSED")}
                              className="flex items-center gap-1 text-[11px] font-bold text-stone-400 hover:bg-stone-100 dark:hover:bg-[#252837] px-2 py-1 rounded-lg transition-colors">
                              <XCircle className="w-3 h-3" /> Dismiss
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {/* Expanded detail row */}
                  {expandedRow === report.id && (
                    <tr key={`${report.id}-detail`} className="bg-stone-50 dark:bg-[#13151f]">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Target</p>
                            <div className="flex items-center gap-1.5">
                              {report.target_type === "LISTING"
                                ? <><Package className="w-3.5 h-3.5 text-teal-500" /><span className="text-xs font-semibold text-stone-700 dark:text-stone-200">Listing</span></>
                                : <><User    className="w-3.5 h-3.5 text-blue-500" /><span className="text-xs font-semibold text-stone-700 dark:text-stone-200">User Account</span></>
                              }
                            </div>
                            <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">{report.target_name}</p>
                          </div>
                          <div className="sm:col-span-2">
                            <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Reporter&apos;s Description</p>
                            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                              {report.description ?? <span className="italic text-stone-400">No additional description provided.</span>}
                            </p>
                          </div>
                          {report.reviewed_by && (
                            <div>
                              <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Reviewed By</p>
                              <p className="text-xs text-stone-600 dark:text-stone-300">{report.reviewed_by} · {report.reviewed_at}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
