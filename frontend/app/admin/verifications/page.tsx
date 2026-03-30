"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search, X, CheckCircle2, XCircle, ShieldCheck, Clock,
  Eye, AlertTriangle, IdCard, ChevronLeft, ChevronRight,
  User, Phone, Calendar, Hash, Monitor, Globe,
  Cpu, CreditCard, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { validateImageURL } from "@/utils/validation";
import {
  getAdminVerifications,
  setAdminVerificationStatus,
  type AdminVerificationRecord,
} from "@/services/adminVerificationsService";

// ── shadcn ─────────────────────────────────────────────────────────────────────
import { Button }            from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input }             from "@/components/ui/input";
import { Label }             from "@/components/ui/label";
import { Separator }         from "@/components/ui/separator";
import { Textarea }          from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

// ── Types ──────────────────────────────────────────────────────────────────────
type VerifStatus = "PENDING" | "VERIFIED" | "REJECTED";

interface AdminVerification {
  id:                string;
  user_id:           string;
  // Registered profile
  user_name:         string;
  user_email:        string;
  profile_image_url: string;
  // Submitted personal info (from become-seller form)
  id_first_name:     string;
  id_last_name:      string;
  id_birthdate:      string;
  mobile_number:     string;
  // ID document
  id_type:           string;
  id_number:         string;
  id_image_front_url:string;
  id_image_back_url: string;
  selfie_url:        string;
  // Submission metadata
  ip_address:        string;
  user_agent:        string;
  hardware_info:     string;   // JSON string from getDeviceInfo()
  // Review state
  status:            VerifStatus;
  reason:  string | null;
  reviewed_by:       string | null;
  reviewed_at:       string | null;
  submitted_date:      string;
  submitted_time:    string;
}

const STATUS_CONFIG: Record<VerifStatus, { cls: string; label: string; Icon: React.ElementType }> = {
  PENDING:  { cls: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300", label: "Pending",  Icon: Clock       },
  VERIFIED: { cls: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",     label: "Verified", Icon: ShieldCheck },
  REJECTED: { cls: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",         label: "Rejected", Icon: XCircle     },
};

// ── Shared sub-components ──────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-2.5">
      {children}
    </p>
  );
}

function InfoRow({ icon: Icon, label, value, mono = false }: {
  icon:  React.ElementType;
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-stone-400 dark:text-stone-500 shrink-0 mt-2" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest leading-none mb-0.5">
          {label}
        </p>
        <p className={cn(
          "text-sm break-words",
          mono ? "font-mono text-stone-700 dark:text-stone-200" : "text-stone-700 dark:text-stone-200",
          !value && "text-stone-400 dark:text-stone-600 italic font-normal",
        )}>
          {value ?? "—"}
        </p>
      </div>
    </div>
  );
}

function IdImageCard({ label, imageUrl }: { label: string; imageUrl?: string | null }) {
  const resolvedUrl = imageUrl ? validateImageURL(imageUrl) : "";

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
        {label}
      </p>
      {resolvedUrl ? (
        <button
          type="button"
          onClick={() => window.open(resolvedUrl, "_blank", "noopener,noreferrer")}
          className="aspect-[4/3] w-full rounded-xl overflow-hidden border border-stone-200 dark:border-[#2a2d3e] bg-stone-100 dark:bg-[#13151f] hover:opacity-95 transition-opacity"
          title="View full image"
        >
          <img
            src={resolvedUrl}
            alt={label}
            className="w-full h-full object-cover"
          />
        </button>
      ) : (
        <div className="aspect-[4/3] rounded-xl bg-stone-100 dark:bg-[#13151f] border-2 border-dashed border-stone-200 dark:border-[#2a2d3e] flex flex-col items-center justify-center gap-2">
          <IdCard className="w-9 h-9 text-stone-300 dark:text-stone-600" />
          <span className="text-xs font-medium text-stone-400 dark:text-stone-500">No image</span>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, options }: {
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
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
        <svg className="w-3.5 h-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

// ── Detail modal ───────────────────────────────────────────────────────────────
interface DetailModalProps {
  verif:          AdminVerification;
  onClose:        () => void;
  onApprove:      (id: string, reason: string) => Promise<void>;
  onReject:       (id: string, reason: string) => Promise<void>;
  actionLoading?: boolean;
}

function DetailModal({ verif, onClose, onApprove, onReject, actionLoading = false }: DetailModalProps) {
  const [rejectReason, setRejectReason] = useState(
    // Pre-fill when viewing a previously rejected submission
    verif.status === "REJECTED" ? (verif.reason ?? "") : "",
  );
  const [hardwareOpen, setHardwareOpen] = useState(false);

  const sc   = STATUS_CONFIG[verif.status];
  const Icon = sc.Icon;

  const submittedName = `${verif.id_first_name} ${verif.id_last_name}`.trim();
  const nameMatch     = submittedName.toLowerCase() === verif.user_name.toLowerCase();
  const hasReason = rejectReason.trim().length > 0;

  const hardwarePretty = useMemo(() => {
    if (!verif.hardware_info) return null;
    try   { return JSON.stringify(JSON.parse(verif.hardware_info), null, 2); }
    catch { return verif.hardware_info; }
  }, [verif.hardware_info]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      {/* ── Modal shell — max-w-5xl two-column ── */}
      <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="bg-[#1e2433] px-6 py-4 flex items-center justify-between shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <IdCard className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-white font-bold text-base leading-none">Verification Request</h2>
              <p className="text-slate-400 text-sm mt-0.5 truncate">
                By {verif.user_name} · Submitted on {verif.submitted_date} · {verif.submitted_time}
              </p>
            </div>
            <span className={cn(
              "ml-2 text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 shrink-0",
              sc.cls,
            )}>
              <Icon className="w-3 h-3" /> {sc.label}
            </span>
          </div>
          <Button
            type="button" variant="ghost" size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 h-7 w-7 shrink-0 ml-3"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* ── Two-column body ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">

          {/* ════ LEFT — Personal + metadata ════ */}
          <div className="lg:w-[35%] overflow-y-auto border-b lg:border-b-0 lg:border-r border-stone-200 dark:border-[#2a2d3e] p-5 space-y-5">

            {/* ── Profile vs. Submitted comparison card ── */}
            <div> 
              <SectionLabel>Identity Comparison</SectionLabel>
              <Card className="py-0 overflow-hidden dark:bg-[#13151f] dark:border-[#2a2d3e]">
                <CardContent className="p-0">
                  <div className="grid divide-x divide-stone-200 dark:divide-[#2a2d3e]">

                    {/* Registered profile side */}
                    <div className="p-3.5 space-y-2.5">
                      <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                        Profile
                      </p>
                      <div className="flex items-center gap-2.5">
                        <Image
                          src={validateImageURL(verif.profile_image_url) || "/profile-icon.png"}
                          alt={verif.user_name}
                          width={32}
                          height={32}
                          className="w-9 h-9 rounded-full object-cover border border-stone-200 dark:border-[#2a2d3e] shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-stone-800 dark:text-stone-100 truncate">
                            {verif.user_name}
                          </p>
                          <p className="text-xs text-stone-400 dark:text-stone-500 truncate">
                            {verif.user_email}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Submitted info side */}
                    <div className="p-3.5 space-y-2.5">
                      <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                        Submitted
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <User className="w-4 h-4 text-stone-400 shrink-0" />
                          <p className={cn(
                            "text-sm font-semibold truncate",
                            nameMatch ? "text-teal-700 dark:text-teal-400" : "text-amber-700 dark:text-amber-400",
                          )}>
                            {submittedName}
                          </p>
                          {nameMatch
                            ? <CheckCircle2  className="w-4 h-4 text-teal-500 shrink-0"  />
                            : <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                          }
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-4 h-4 text-stone-400 shrink-0" />
                          <p className="text-sm font-mono text-stone-700 dark:text-stone-200 truncate">
                            {verif.mobile_number}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Match verdict strip */}
                  <div className={cn(
                    "px-3.5 py-2 text-sm font-semibold flex items-center gap-1.5 border-t border-stone-200 dark:border-[#2a2d3e]",
                    nameMatch
                      ? "bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400"
                      : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400",
                  )}>
                    {nameMatch
                      ? <><CheckCircle2 className="w-4 h-4" />  Name matches registered profile</>
                      : <><AlertTriangle className="w-4 h-4" /> Name differs from registered profile</>
                    }
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator className="dark:bg-[#2a2d3e]" />

            {/* ── ID document details ── */}
            <div>
              <SectionLabel>ID Document Details</SectionLabel>
              <div className="space-y-3.5">
                <InfoRow icon={CreditCard} label="ID Type"       value={verif.id_type.toUpperCase()}               />
                <InfoRow icon={Hash}       label="ID Number"     value={verif.id_number}      mono   />
                <InfoRow icon={Calendar}   label="Date of Birth" value={verif.id_birthdate}           />
                <InfoRow icon={Phone}      label="Mobile Number" value={verif.mobile_number} />
              </div>
            </div>

            <Separator className="dark:bg-[#2a2d3e]" />

            {/* ── Submission metadata ── */}
            <div>
              <SectionLabel>Submission Metadata</SectionLabel>
              <div className="space-y-3.5">
                <InfoRow icon={Globe}   label="IP Address" value={verif.ip_address} mono />
                <InfoRow icon={Monitor} label="User Agent" value={verif.user_agent}      />
              </div>

              {/* Hardware JSON — collapsible */}
              {hardwarePretty && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setHardwareOpen(v => !v)}
                    className="w-full flex items-center gap-1.5 text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest hover:text-stone-600 dark:hover:text-stone-300 transition-colors mb-2"
                  >
                    <Cpu className="w-4 h-4" />
                    Device Hardware Info
                    {hardwareOpen
                      ? <ChevronUp   className="w-3 h-3 ml-auto" />
                      : <ChevronDown className="w-3 h-3 ml-auto" />
                    }
                  </button>
                  {hardwareOpen && (
                    <pre className="text-sm leading-relaxed font-mono bg-stone-100 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl p-3 overflow-x-auto text-stone-600 dark:text-stone-300 whitespace-pre-wrap break-all">
                      {hardwarePretty}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* ── Existing reason ── */}``
            <>
              <Separator className="dark:bg-[#2a2d3e]" />
              <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3.5 space-y-1.5">
                <SectionLabel>Reason</SectionLabel>
                <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed">
                  {verif.reason}
                </p>
                {verif.reviewed_by && (
                  <p className="text-xs text-red-400 dark:text-red-500 mt-1">
                    By {verif.reviewed_by} · {verif.reviewed_at}
                  </p>
                )}
              </div>
            </>
          </div>

          {/* ════ RIGHT — ID images + reject input ════ */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

            {/* ID photo captures — larger for easier review */}
            <div>
              <SectionLabel>Uploaded Photos</SectionLabel>
              <div className="space-y-4">
                <IdImageCard label="ID — Front" imageUrl={verif.id_image_front_url} />
                <IdImageCard label="ID — Back" imageUrl={verif.id_image_back_url} />
                <IdImageCard label="Selfie while holding ID" imageUrl={verif.selfie_url} />
              </div>
            </div>

            {/* ── Reject reason field — visible for PENDING only ── */}
            {verif.status === "PENDING" && (
              <>
                <Separator className="dark:bg-[#2a2d3e]" />
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                    Reason
                    <span className="normal-case font-normal text-stone-400 dark:text-stone-600 ml-1.5">
                      — required for approve/reject
                    </span>
                  </Label>
                  <Textarea
                    rows={4}
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Explain clearly why the submission is being rejected so the user can resubmit correctly…"
                    className="resize-none text-xs dark:bg-[#13151f] dark:border-[#2a2d3e] dark:text-stone-100 dark:placeholder-stone-600"
                  />
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    This message will be shown to the applicant.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Footer actions ───────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-stone-200 dark:border-[#2a2d3e] px-6 py-4 flex items-center gap-2.5 rounded-b-2xl bg-white dark:bg-[#1c1f2e]">
          <Button
            type="button" variant="outline"
            onClick={onClose}
            className="rounded-full dark:border-[#2a2d3e] dark:text-stone-300 dark:hover:bg-[#252837]"
          >
            Close
          </Button>

          {verif.status === "PENDING" && (
            <div className="flex items-center gap-2.5 ml-auto">
              <Button
                type="button" variant="outline"
                disabled={!hasReason || actionLoading}
                onClick={() => void onReject(verif.id, rejectReason.trim())}
                className="rounded-full border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 hover:border-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Reject
              </Button>
              <Button
                type="button"
                disabled={!hasReason || actionLoading}
                onClick={() => void onApprove(verif.id, rejectReason.trim())}
                className="rounded-full bg-teal-700 hover:bg-teal-600 text-white font-bold"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Approve
              </Button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function VerificationsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminVerification | null>(null);
  const [records, setRecords] = useState<AdminVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const PER_PAGE = 8;

  const mapRecord = useCallback((record: AdminVerificationRecord): AdminVerification => {
    const submitted = new Date(record.submitted_at);
    const reviewed = record.reviewed_at ? new Date(record.reviewed_at) : null;

    return {
      id: record.id,
      user_id: record.user_id,
      user_name: record.user_name,
      user_email: record.user_email,
      profile_image_url: record.profile_image_url,
      id_first_name: record.id_first_name,
      id_last_name: record.id_last_name,
      id_birthdate: record.id_birthdate ? new Date(record.id_birthdate).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }) : "",
      mobile_number: record.mobile_number,
      id_type: record.id_type,
      id_number: record.id_number,
      id_image_front_url: record.id_image_front_url,
      id_image_back_url: record.id_image_back_url,
      selfie_url: record.selfie_url,
      ip_address: record.ip_address,
      user_agent: record.user_agent,
      hardware_info: record.hardware_info,
      status: record.status,
      reason: record.rejection_reason,
      reviewed_by: record.reviewed_by,
      reviewed_at: reviewed && !Number.isNaN(reviewed.getTime())
        ? reviewed.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
        : null,
      submitted_date: !Number.isNaN(submitted.getTime())
        ? submitted.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
        : record.submitted_at,
        submitted_time: !Number.isNaN(submitted.getTime())
        ? submitted.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })
        : record.submitted_at,
    };
  }, []);

  const loadVerifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminVerifications();
      setRecords((data ?? []).map(mapRecord));
    } catch (error) {
      const message = typeof error === "string" ? error : "Failed to load verification records";
      toast.error(message, { position: "top-center" });
    } finally {
      setLoading(false);
    }
  }, [mapRecord]);

  useEffect(() => {
    void loadVerifications();
  }, [loadVerifications]);

  const filtered = useMemo(() => {
    let data = [...records];
    if (search)
      data = data.filter(v =>
        v.user_name.toLowerCase().includes(search.toLowerCase()) ||
        v.user_email.toLowerCase().includes(search.toLowerCase()),
      );
    if (statusFilter !== "ALL") data = data.filter(v => v.status === statusFilter);
    return data;
  }, [records, search, statusFilter]);

  const totalPages    = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged         = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const pendingCount  = records.filter(r => r.status === "PENDING").length;
  const verifiedCount = records.filter(r => r.status === "VERIFIED").length;
  const rejectedCount = records.filter(r => r.status === "REJECTED").length;
  const hasActiveFilters = search || statusFilter !== "ALL";

  async function handleApprove(id: string, reason: string) {
    if (!window.confirm("Approve this verification request? This action cannot be changed from this table.")) return;

    setActionLoading(true);
    try {
      await setAdminVerificationStatus(id, { status: "VERIFIED", reason });
      await loadVerifications();
      setSelected(null);
      toast.success("Verification approved successfully", { position: "top-center" });
    } catch (error) {
      const message = typeof error === "string" ? error : "Failed to approve verification";
      toast.error(message, { position: "top-center" });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(id: string, reason: string) {
    if (!window.confirm("Reject this verification request? This action cannot be changed from this table.")) return;

    setActionLoading(true);
    try {
      await setAdminVerificationStatus(id, { status: "REJECTED", reason });
      await loadVerifications();
      setSelected(null);
      toast.success("Verification rejected successfully", { position: "top-center" });
    } catch (error) {
      const message = typeof error === "string" ? error : "Failed to reject verification";
      toast.error(message, { position: "top-center" });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="p-5 sm:p-6 space-y-5">

      {/* Page header */}
      <div>
        <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-50">
          User Verifications
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          Review submitted identity documents and approve or reject seller verification requests
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending",  count: pendingCount,  status: "PENDING",  color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800", Icon: AlertTriangle },
          { label: "Verified", count: verifiedCount, status: "VERIFIED", color: "text-teal-600 dark:text-teal-400",   bg: "bg-teal-50 dark:bg-teal-950/20",   border: "border-teal-200 dark:border-teal-800",   Icon: ShieldCheck   },
          { label: "Rejected", count: rejectedCount, status: "REJECTED", color: "text-red-600 dark:text-red-400",     bg: "bg-red-50 dark:bg-red-950/20",     border: "border-red-200 dark:border-red-800",     Icon: XCircle       },
        ].map(({ label, count, status, color, bg, border, Icon }) => (
          <Card
            key={label}
            className={cn(
              "rounded-lg cursor-pointer hover:shadow-sm transition-all border",
              bg, border,
              statusFilter === status && "ring-2 ring-offset-1 ring-current",
            )}
            onClick={() => { setStatusFilter(prev => prev === status ? "ALL" : status); setPage(1); }}
          >
            <CardContent className="text-center">
              <Icon className={cn("w-5 h-5 mx-auto mb-1.5", color)} />
              <p className={cn("text-xl font-extrabold", color)}>{count}</p>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email…"
            className="pl-9 dark:bg-[#13151f] dark:border-[#2a2d3e]"
          />
        </div>
        <div className="flex gap-2">
          <FilterSelect
            value={statusFilter}
            onChange={v => { setStatusFilter(v); setPage(1); }}
            options={[
              ["ALL", "All Status"], ["PENDING", "Pending"],
              ["VERIFIED", "Verified"], ["REJECTED", "Rejected"],
            ]}
          />
          {hasActiveFilters && (
            <Button
              variant="outline" size="sm"
              onClick={() => { setSearch(""); setStatusFilter("ALL"); setPage(1); }}
              className="gap-1.5 border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 hover:border-red-300"
            >
              <X className="w-3 h-3" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="p-0 rounded-lg dark:bg-[#1c1f2e] dark:border-[#2a2d3e] overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f] hover:bg-stone-50 dark:hover:bg-[#13151f]">
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Applicant</TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Submitted Name</TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">ID Type</TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Status</TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">Submitted</TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">Reviewed By</TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">
                      Loading verification requests...
                    </TableCell>
                  </TableRow>
                ) : paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center text-sm text-stone-400 dark:text-stone-500">
                      No verification requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map(verif => {
                    const sc         = STATUS_CONFIG[verif.status];
                    const StatusIcon = sc.Icon;
                    return (
                      <TableRow key={verif.id} className="border-stone-100 dark:border-[#2a2d3e] hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors">

                        {/* Applicant */}
                        <TableCell className="py-2">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/profile?userId=${verif.user_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View reporter profile"
                              aria-label="View reporter profile"
                              className="shrink-0"
                            >
                              <Image
                                src={validateImageURL(verif.profile_image_url) || "/profile-icon.png"}
                                alt={verif.user_name}
                                width={32}
                                height={32}
                                className="w-9 h-9 rounded-full object-cover border border-stone-200 dark:border-[#2a2d3e] shrink-0"
                              />
                            </Link>
                            <div>
                              <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{verif.user_name}</p>
                              <p className="text-xs text-stone-400 dark:text-stone-500">{verif.user_email}</p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                            <p className="text-stone-800 dark:text-stone-100">{`${verif.id_first_name} ${verif.id_last_name}`}</p>
                        </TableCell>

                        {/* ID Type */}
                        <TableCell className="py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-[#13151f] px-2 py-1 rounded-lg">
                            <IdCard className="w-3 h-3 text-stone-400" /> {verif.id_type.toUpperCase()}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3.5 whitespace-nowrap">
                          <span className={cn("inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full", sc.cls)}>
                            <StatusIcon className="w-2.5 h-2.5" /> {sc.label}
                          </span>
                        </TableCell>

                        {/* Submitted At */}
                        <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{verif.submitted_date}</p>
                            <p className="text-xs text-stone-400 dark:text-stone-500">{verif.submitted_time}</p>
                          </div>
                        </TableCell>

                        {/* Reviewed By */}
                        <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                          {verif.reviewed_by
                            ? (
                              <div>
                                <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{verif.reviewed_by}</p>
                                <p className="text-xs text-stone-400 dark:text-stone-500">{verif.reviewed_at}</p>
                              </div>
                            ) : <span className="text-stone-300 dark:text-stone-600">Not yet reviewed</span>
                          }
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost" size="icon" type="button"
                              title={verif.status === "PENDING" ? "Review" : "View"}
                              aria-label={verif.status === "PENDING" ? "Review" : "View"}
                              onClick={() => setSelected(verif)}
                              className="w-7 h-7 text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-[#252837]"
                            >
                              <Eye className="w-4 h-4" />
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

          {/* Pagination */}
          <Separator className="dark:bg-[#2a2d3e]" />
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm text-stone-400 dark:text-stone-500">
              Page {page} of {totalPages} · {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline" size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 w-8 p-0 rounded-lg dark:border-[#2a2d3e] dark:text-stone-300 dark:hover:bg-[#252837]"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <Button
                  key={n}
                  variant={page === n ? "default" : "ghost"} size="sm"
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
                variant="outline" size="sm"
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

      {/* Detail modal */}
      {selected && (
        <DetailModal
          verif={selected}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}
