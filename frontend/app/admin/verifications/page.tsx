"use client";

import { useState, useMemo } from "react";
import {
  Search, Filter, X, CheckCircle2, XCircle, ShieldCheck,
  Clock, Eye, AlertTriangle, IdCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

type VerifStatus = "PENDING" | "VERIFIED" | "REJECTED";

interface AdminVerification {
  id:            string;
  user_id:       string;
  user_name:     string;
  user_email:    string;
  id_type:       string;
  id_number:     string;
  status:        VerifStatus;
  rejection_reason: string | null;
  reviewed_by:   string | null;
  reviewed_at:   string | null;
  submitted_at:  string;
}

const VERIFICATIONS: AdminVerification[] = [
  { id:"v1",  user_id:"u1",  user_name:"Juan Miguel Dela Cruz",   user_email:"juan@email.com",    id_type:"PhilSys ID",       id_number:"1234-5678-9012",   status:"PENDING",  rejection_reason:null,                   reviewed_by:null,        reviewed_at:null,           submitted_at:"Mar 19, 2026 · 8:00 AM" },
  { id:"v2",  user_id:"u2",  user_name:"Maria Cristina Santos",   user_email:"maria@email.com",   id_type:"Passport",         id_number:"P1234567A",         status:"PENDING",  rejection_reason:null,                   reviewed_by:null,        reviewed_at:null,           submitted_at:"Mar 18, 2026 · 4:30 PM" },
  { id:"v3",  user_id:"u7",  user_name:"Ramon Torres",            user_email:"ramon@email.com",   id_type:"Driver's License", id_number:"N07-89-012345",     status:"PENDING",  rejection_reason:null,                   reviewed_by:null,        reviewed_at:null,           submitted_at:"Mar 17, 2026 · 2:00 PM" },
  { id:"v4",  user_id:"u3",  user_name:"Pedro Jose Reyes",        user_email:"pedro@email.com",   id_type:"SSS ID",           id_number:"34-1234567-8",      status:"VERIFIED", rejection_reason:null,                   reviewed_by:"Admin One", reviewed_at:"Mar 15, 2026", submitted_at:"Mar 12, 2026 · 10:00 AM" },
  { id:"v5",  user_id:"u4",  user_name:"Ana Liza Bautista",       user_email:"ana@email.com",     id_type:"Voter's ID",       id_number:"1234-56-789-0123",  status:"VERIFIED", rejection_reason:null,                   reviewed_by:"Admin One", reviewed_at:"Mar 10, 2026", submitted_at:"Mar 7, 2026 · 9:00 AM" },
  { id:"v6",  user_id:"u6",  user_name:"Luisa Mae Garcia",        user_email:"luisa@email.com",   id_type:"PhilSys ID",       id_number:"9876-5432-1098",   status:"REJECTED", rejection_reason:"Uploaded ID image is blurry and cannot be verified. Selfie does not clearly show the ID. Please resubmit with clearer photos.", reviewed_by:"Admin One", reviewed_at:"Mar 18, 2026", submitted_at:"Mar 16, 2026 · 11:00 AM" },
];

const ID_TYPES = ["PhilSys ID","Passport","Driver's License","SSS ID","GSIS ID","Voter's ID","Other Gov't ID"];

const STATUS_CONFIG: Record<VerifStatus, { cls: string; label: string; Icon: React.ElementType }> = {
  PENDING:  { cls:"bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",  label:"Pending",  Icon:Clock       },
  VERIFIED: { cls:"bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",      label:"Verified", Icon:ShieldCheck  },
  REJECTED: { cls:"bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",          label:"Rejected", Icon:XCircle     },
};

interface DetailModalProps {
  verif:   AdminVerification;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject:  (id: string, reason: string) => void;
}

function DetailModal({ verif, onClose, onApprove, onReject }: DetailModalProps) {
  const [rejectMode,   setRejectMode]   = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const sc = STATUS_CONFIG[verif.status];
  const Icon = sc.Icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-[#1c1f2e] rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1e2433] px-6 py-5 flex items-start justify-between flex-shrink-0 rounded-t-3xl sm:rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <IdCard className="w-4 h-4 text-amber-400" />
              <h2 className="text-white font-bold text-base">Verification Request</h2>
            </div>
            <p className="text-slate-400 text-xs">{verif.user_name} · {verif.submitted_at}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* User info */}
          <div className="flex items-center gap-3 p-4 bg-stone-50 dark:bg-[#13151f] rounded-xl border border-stone-200 dark:border-[#2a2d3e]">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3a4a6a] to-[#1e2a40] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {verif.user_name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{verif.user_name}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">{verif.user_email}</p>
            </div>
            <span className={cn("ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1", sc.cls)}>
              <Icon className="w-2.5 h-2.5" /> {sc.label}
            </span>
          </div>

          {/* Submitted ID info */}
          <div>
            <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-3">Submitted Documents</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-stone-50 dark:bg-[#13151f] rounded-xl p-3 border border-stone-200 dark:border-[#2a2d3e]">
                <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">ID Type</p>
                <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{verif.id_type}</p>
              </div>
              <div className="bg-stone-50 dark:bg-[#13151f] rounded-xl p-3 border border-stone-200 dark:border-[#2a2d3e]">
                <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">ID Number</p>
                <p className="text-sm font-bold text-stone-800 dark:text-stone-100 font-mono">{verif.id_number}</p>
              </div>
            </div>
          </div>

          {/* Image placeholders */}
          <div>
            <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-3">Uploaded Images</p>
            <div className="grid grid-cols-3 gap-2">
              {["ID — Front", "ID — Back", "Selfie with ID"].map(label => (
                <div key={label} className="aspect-square rounded-xl bg-stone-100 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-stone-200 dark:hover:bg-[#252837] transition-colors">
                  <IdCard className="w-6 h-6 text-stone-300 dark:text-stone-600" />
                  <span className="text-[10px] text-stone-400 dark:text-stone-500 text-center px-1">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-2">Click any image to view full size · Images served from secure storage</p>
          </div>

          {/* Rejection reason (if rejected) */}
          {verif.status === "REJECTED" && verif.rejection_reason && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-xs font-bold text-red-700 dark:text-red-400 mb-1.5">Rejection Reason</p>
              <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">{verif.rejection_reason}</p>
              {verif.reviewed_by && (
                <p className="text-[10px] text-red-400 dark:text-red-500 mt-2">Reviewed by {verif.reviewed_by} · {verif.reviewed_at}</p>
              )}
            </div>
          )}

          {/* Reject form */}
          {rejectMode && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-xs font-bold text-red-700 dark:text-red-400 mb-2">Rejection Reason</p>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Explain clearly why the submission is being rejected so the user can resubmit correctly…"
                className="w-full bg-white dark:bg-[#1c1f2e] border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5 text-xs text-stone-800 dark:text-stone-100 placeholder-stone-400 outline-none focus:border-red-400 resize-none transition-colors"
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        {verif.status === "PENDING" && (
          <div className="px-6 pb-6 pt-3 border-t border-stone-100 dark:border-[#252837] flex gap-2.5 flex-shrink-0">
            {!rejectMode ? (
              <>
                <button type="button" onClick={onClose}
                  className="flex-1 py-3 rounded-full border border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300 text-sm font-semibold hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors">
                  Close
                </button>
                <button type="button" onClick={() => setRejectMode(true)}
                  className="flex-1 py-3 rounded-full border border-red-200 dark:border-red-800 text-red-500 text-sm font-bold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                  Reject
                </button>
                <button type="button" onClick={() => onApprove(verif.id)}
                  className="flex-1 py-3 rounded-full bg-teal-700 hover:bg-teal-600 text-white text-sm font-bold transition-colors">
                  Approve ✓
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setRejectMode(false)}
                  className="flex-1 py-3 rounded-full border border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300 text-sm font-semibold hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors">
                  ← Back
                </button>
                <button type="button"
                  onClick={() => {
                    if (!rejectReason.trim()) { window.alert("Please provide a rejection reason."); return; }
                    onReject(verif.id, rejectReason.trim());
                  }}
                  className="flex-1 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors">
                  Confirm Rejection
                </button>
              </>
            )}
          </div>
        )}
        {verif.status !== "PENDING" && (
          <div className="px-6 pb-6 pt-3 border-t border-stone-100 dark:border-[#252837]">
            <button type="button" onClick={onClose}
              className="w-full py-3 rounded-full border border-stone-200 dark:border-[#2a2d3e] text-stone-600 dark:text-stone-300 text-sm font-semibold hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerificationsPage() {
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected,     setSelected]     = useState<AdminVerification | null>(null);
  const [records,      setRecords]      = useState<AdminVerification[]>(VERIFICATIONS);

  const filtered = useMemo(() => {
    let data = [...records];
    if (search)             data = data.filter(v => v.user_name.toLowerCase().includes(search.toLowerCase()) || v.user_email.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== "ALL") data = data.filter(v => v.status === statusFilter);
    return data;
  }, [records, search, statusFilter]);

  const pendingCount  = records.filter(r => r.status === "PENDING").length;
  const verifiedCount = records.filter(r => r.status === "VERIFIED").length;
  const rejectedCount = records.filter(r => r.status === "REJECTED").length;

  function handleApprove(id: string) {
    setRecords(rs => rs.map(r => r.id === id
      ? { ...r, status: "VERIFIED", reviewed_by: "Admin One", reviewed_at: new Date().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) }
      : r
    ));
    setSelected(null);
  }

  function handleReject(id: string, reason: string) {
    setRecords(rs => rs.map(r => r.id === id
      ? { ...r, status: "REJECTED", rejection_reason: reason, reviewed_by: "Admin One", reviewed_at: new Date().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) }
      : r
    ));
    setSelected(null);
  }

  return (
    <div className="p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-50">User Verifications</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Review submitted identity documents and approve or reject seller verification requests</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:"Pending",  count:pendingCount,  status:"PENDING",  color:"text-amber-600 dark:text-amber-400", bg:"bg-amber-50 dark:bg-amber-950/20",  border:"border-amber-200 dark:border-amber-800",  Icon:AlertTriangle },
          { label:"Verified", count:verifiedCount, status:"VERIFIED", color:"text-teal-600 dark:text-teal-400",   bg:"bg-teal-50 dark:bg-teal-950/20",    border:"border-teal-200 dark:border-teal-800",    Icon:ShieldCheck   },
          { label:"Rejected", count:rejectedCount, status:"REJECTED", color:"text-red-600 dark:text-red-400",     bg:"bg-red-50 dark:bg-red-950/20",      border:"border-red-200 dark:border-red-800",      Icon:XCircle       },
        ].map(({ label, count, status, color, bg, border, Icon }) => (
          <div key={label}
            className={cn("rounded-2xl border p-4 text-center cursor-pointer hover:shadow-sm transition-all", bg, border)}
            onClick={() => setStatusFilter(prev => prev === status ? "ALL" : status)}>
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
              className="w-full pl-9 pr-3 py-2.5 bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400 outline-none focus:border-stone-400 transition-colors" />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="pl-7 pr-8 py-2.5 bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl text-sm text-stone-700 dark:text-stone-200 outline-none focus:border-stone-400 transition-colors appearance-none cursor-pointer">
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="VERIFIED">Verified</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            {(search || statusFilter !== "ALL") && (
              <button onClick={() => { setSearch(""); setStatusFilter("ALL"); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-2.5">{filtered.length} request{filtered.length !== 1 ? "s" : ""} found</p>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f]">
              <tr>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Applicant</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">ID Type</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Status</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">Submitted</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">Reviewed By</th>
                <th className="py-3 px-4 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-[#2a2d3e]">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">No verification requests found.</td></tr>
              ) : filtered.map(verif => {
                const sc = STATUS_CONFIG[verif.status];
                const StatusIcon = sc.Icon;
                return (
                  <tr key={verif.id} className="hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3a4a6a] to-[#1e2a40] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {verif.user_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-800 dark:text-stone-100">{verif.user_name}</p>
                          <p className="text-[11px] text-stone-400 dark:text-stone-500">{verif.user_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-[#13151f] px-2 py-1 rounded-lg">
                        <IdCard className="w-3 h-3 text-stone-400" /> {verif.id_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full", sc.cls)}>
                        <StatusIcon className="w-2.5 h-2.5" /> {sc.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">{verif.submitted_at}</td>
                    <td className="py-3.5 px-4 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
                      {verif.reviewed_by
                        ? <span>{verif.reviewed_by} · {verif.reviewed_at}</span>
                        : <span className="text-stone-300 dark:text-stone-600">Not yet reviewed</span>
                      }
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelected(verif)}
                          className="flex items-center gap-1 text-[11px] font-bold text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 transition-colors px-2 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-[#252837]"
                        >
                          <Eye className="w-3 h-3" />
                          {verif.status === "PENDING" ? "Review" : "View"}
                        </button>
                        {verif.status === "PENDING" && (
                          <>
                            <button onClick={() => handleApprove(verif.id)}
                              className="flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 px-2 py-1 rounded-lg transition-colors">
                              <CheckCircle2 className="w-3 h-3" /> Approve
                            </button>
                            <button onClick={() => setSelected(verif)}
                              className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 px-2 py-1 rounded-lg transition-colors">
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <DetailModal
          verif={selected}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
