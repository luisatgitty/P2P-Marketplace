"use client";

import { useState, useMemo } from "react";
import {
  Search, X, CheckCircle2, XCircle, ShieldCheck, Clock,
  Eye, AlertTriangle, IdCard, ChevronLeft, ChevronRight,
  User, Phone, Mail, Calendar, Hash, Monitor, Globe,
  Cpu, CreditCard, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  profile_image_url: string | null;
  // Submitted personal info (from become-seller form)
  first_name:        string;
  last_name:         string;
  date_of_birth:     string;
  mobile_number:     string;
  // ID document
  id_type:           string;
  id_number:         string;
  // Submission metadata
  ip_address:        string | null;
  user_agent:        string | null;
  hardware_info:     string | null;   // JSON string from getDeviceInfo()
  // Review state
  status:            VerifStatus;
  rejection_reason:  string | null;
  reviewed_by:       string | null;
  reviewed_at:       string | null;
  submitted_at:      string;
}

// ── Static data ────────────────────────────────────────────────────────────────
const VERIFICATIONS: AdminVerification[] = [
  {
    id: "v1", user_id: "u1",
    user_name: "Juan Miguel Dela Cruz", user_email: "juan@email.com", profile_image_url: null,
    first_name: "Juan Miguel", last_name: "Dela Cruz", date_of_birth: "1995-04-12", mobile_number: "9171234567",
    id_type: "PhilSys ID", id_number: "1234-5678-9012",
    ip_address: "112.200.45.11",
    user_agent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    hardware_info: JSON.stringify({ deviceType: "mobile", isMobile: true, signals: { mobileUserAgent: true, coarsePointer: true, maxTouchPoints: 5, screenWidthPx: 412, devicePixelRatio: 2.625, orientation: "portrait-primary", touchEventsExist: true } }),
    status: "PENDING", rejection_reason: null, reviewed_by: null, reviewed_at: null, submitted_at: "Mar 19, 2026 · 8:00 AM",
  },
  {
    id: "v2", user_id: "u2",
    user_name: "Maria Cristina Santos", user_email: "maria@email.com", profile_image_url: null,
    first_name: "Maria Cristina", last_name: "Santos", date_of_birth: "1990-11-23", mobile_number: "9181234567",
    id_type: "Passport", id_number: "P1234567A",
    ip_address: "175.45.22.88",
    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    hardware_info: JSON.stringify({ deviceType: "mobile", isMobile: true, signals: { mobileUserAgent: true, coarsePointer: true, maxTouchPoints: 5, screenWidthPx: 390, devicePixelRatio: 3, orientation: "portrait-primary", touchEventsExist: true } }),
    status: "PENDING", rejection_reason: null, reviewed_by: null, reviewed_at: null, submitted_at: "Mar 18, 2026 · 4:30 PM",
  },
  {
    id: "v3", user_id: "u7",
    user_name: "Ramon Torres", user_email: "ramon@email.com", profile_image_url: null,
    first_name: "Ramon", last_name: "Torres", date_of_birth: "1988-07-05", mobile_number: "9201234567",
    id_type: "Driver's License", id_number: "N07-89-012345",
    ip_address: "103.10.5.200",
    user_agent: "Mozilla/5.0 (Linux; Android 14; Samsung Galaxy S24) AppleWebKit/537.36",
    hardware_info: JSON.stringify({ deviceType: "mobile", isMobile: true, signals: { mobileUserAgent: true, coarsePointer: true, maxTouchPoints: 10, screenWidthPx: 360, devicePixelRatio: 3, orientation: "portrait-primary", touchEventsExist: true } }),
    status: "PENDING", rejection_reason: null, reviewed_by: null, reviewed_at: null, submitted_at: "Mar 17, 2026 · 2:00 PM",
  },
  {
    id: "v4", user_id: "u3",
    user_name: "Pedro Jose Reyes", user_email: "pedro@email.com", profile_image_url: null,
    first_name: "Pedro Jose", last_name: "Reyes", date_of_birth: "1992-02-18", mobile_number: "9991234567",
    id_type: "SSS ID", id_number: "34-1234567-8",
    ip_address: "180.191.40.3",
    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)",
    hardware_info: null,
    status: "VERIFIED", rejection_reason: null, reviewed_by: "Admin One", reviewed_at: "Mar 15, 2026", submitted_at: "Mar 12, 2026 · 10:00 AM",
  },
  {
    id: "v5", user_id: "u4",
    user_name: "Ana Liza Bautista", user_email: "ana@email.com", profile_image_url: null,
    first_name: "Ana Liza", last_name: "Bautista", date_of_birth: "1997-09-30", mobile_number: "9151234567",
    id_type: "Voter's ID", id_number: "1234-56-789-0123",
    ip_address: "202.90.9.44",
    user_agent: "Mozilla/5.0 (Linux; Android 12; Redmi Note 11)",
    hardware_info: null,
    status: "VERIFIED", rejection_reason: null, reviewed_by: "Admin One", reviewed_at: "Mar 10, 2026", submitted_at: "Mar 7, 2026 · 9:00 AM",
  },
  {
    id: "v6", user_id: "u6",
    user_name: "Luisa Mae Garcia", user_email: "luisa@email.com", profile_image_url: null,
    first_name: "Luisa Mae", last_name: "Garcia", date_of_birth: "2000-01-14", mobile_number: "9061234567",
    id_type: "PhilSys ID", id_number: "9876-5432-1098",
    ip_address: "136.158.3.12",
    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)",
    hardware_info: null,
    status: "REJECTED",
    rejection_reason: "Uploaded ID image is blurry and cannot be verified. Selfie does not clearly show the ID. Please resubmit with clearer photos.",
    reviewed_by: "Admin One", reviewed_at: "Mar 18, 2026", submitted_at: "Mar 16, 2026 · 11:00 AM",
  },
];

const STATUS_CONFIG: Record<VerifStatus, { cls: string; label: string; Icon: React.ElementType }> = {
  PENDING:  { cls: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300", label: "Pending",  Icon: Clock       },
  VERIFIED: { cls: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",     label: "Verified", Icon: ShieldCheck },
  REJECTED: { cls: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",         label: "Rejected", Icon: XCircle     },
};

// ── Shared sub-components ──────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-2.5">
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
      <Icon className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 shrink-0 mt-[3px]" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest leading-none mb-0.5">
          {label}
        </p>
        <p className={cn(
          "text-xs break-words",
          mono ? "font-mono text-stone-700 dark:text-stone-200" : "text-stone-700 dark:text-stone-200",
          !value && "text-stone-400 dark:text-stone-600 italic font-normal",
        )}>
          {value ?? "—"}
        </p>
      </div>
    </div>
  );
}

function IdImageCard({ label }: { label: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
        {label}
      </p>
      <div className="aspect-[4/3] rounded-xl bg-stone-100 dark:bg-[#13151f] border-2 border-dashed border-stone-200 dark:border-[#2a2d3e] flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-stone-200 dark:hover:bg-[#252837] transition-colors group">
        <IdCard className="w-9 h-9 text-stone-300 dark:text-stone-600 group-hover:text-stone-400 dark:group-hover:text-stone-500 transition-colors" />
        <span className="text-xs font-medium text-stone-400 dark:text-stone-500">Click to view</span>
      </div>
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
  verif:     AdminVerification;
  onClose:   () => void;
  onApprove: (id: string) => void;
  onReject:  (id: string, reason: string) => void;
}

function DetailModal({ verif, onClose, onApprove, onReject }: DetailModalProps) {
  const [rejectReason, setRejectReason] = useState(
    // Pre-fill when viewing a previously rejected submission
    verif.status === "REJECTED" ? (verif.rejection_reason ?? "") : "",
  );
  const [hardwareOpen, setHardwareOpen] = useState(false);

  const sc   = STATUS_CONFIG[verif.status];
  const Icon = sc.Icon;

  const submittedName = `${verif.first_name} ${verif.last_name}`.trim();
  const nameMatch     = submittedName.toLowerCase() === verif.user_name.toLowerCase();

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
              <p className="text-slate-400 text-xs mt-0.5 truncate">
                {verif.user_name} · Submitted {verif.submitted_at}
              </p>
            </div>
            <span className={cn(
              "ml-2 text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 shrink-0",
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
          <div className="lg:w-[44%] overflow-y-auto border-b lg:border-b-0 lg:border-r border-stone-200 dark:border-[#2a2d3e] p-5 space-y-5">

            {/* ── Profile vs. Submitted comparison card ── */}
            <div>
              <SectionLabel>Identity Comparison</SectionLabel>
              <Card className="overflow-hidden dark:bg-[#13151f] dark:border-[#2a2d3e]">
                <CardContent className="p-0">
                  <div className="grid grid-cols-2 divide-x divide-stone-200 dark:divide-[#2a2d3e]">

                    {/* Registered profile side */}
                    <div className="p-3.5 space-y-2.5">
                      <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                        Profile
                      </p>
                      <div className="flex items-center gap-2.5">
                        {verif.profile_image_url ? (
                          <img
                            src={verif.profile_image_url}
                            alt={verif.user_name}
                            className="w-10 h-10 rounded-full object-cover border border-stone-200 dark:border-[#2a2d3e] shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3a4a6a] to-[#1e2a40] flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {verif.user_name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-stone-800 dark:text-stone-100 truncate">
                            {verif.user_name}
                          </p>
                          <p className="text-[11px] text-stone-400 dark:text-stone-500 truncate">
                            {verif.user_email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Submitted info side */}
                    <div className="p-3.5 space-y-2.5">
                      <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                        Submitted
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-stone-400 shrink-0" />
                          <p className={cn(
                            "text-xs font-semibold truncate",
                            nameMatch ? "text-teal-700 dark:text-teal-400" : "text-amber-700 dark:text-amber-400",
                          )}>
                            {submittedName}
                          </p>
                          {nameMatch
                            ? <CheckCircle2  className="w-3 h-3 text-teal-500 shrink-0"  />
                            : <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                          }
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                          <p className="text-xs font-mono text-stone-700 dark:text-stone-200 truncate">
                            +63 {verif.mobile_number}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Match verdict strip */}
                  <div className={cn(
                    "px-3.5 py-2 text-[11px] font-semibold flex items-center gap-1.5 border-t border-stone-200 dark:border-[#2a2d3e]",
                    nameMatch
                      ? "bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400"
                      : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400",
                  )}>
                    {nameMatch
                      ? <><CheckCircle2 className="w-3.5 h-3.5" />  Name matches registered profile</>
                      : <><AlertTriangle className="w-3.5 h-3.5" /> Name differs from registered profile</>
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
                <InfoRow icon={CreditCard} label="ID Type"       value={verif.id_type}               />
                <InfoRow icon={Hash}       label="ID Number"     value={verif.id_number}      mono   />
                <InfoRow icon={Calendar}   label="Date of Birth" value={verif.date_of_birth}          />
                <InfoRow icon={Phone}      label="Mobile Number" value={`+63 ${verif.mobile_number}`} />
                <InfoRow icon={Mail}       label="Email Address" value={verif.user_email}             />
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
                    className="w-full flex items-center gap-1.5 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest hover:text-stone-600 dark:hover:text-stone-300 transition-colors mb-2"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    Device Hardware Info
                    {hardwareOpen
                      ? <ChevronUp   className="w-3 h-3 ml-auto" />
                      : <ChevronDown className="w-3 h-3 ml-auto" />
                    }
                  </button>
                  {hardwareOpen && (
                    <pre className="text-[10px] leading-relaxed font-mono bg-stone-100 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl p-3 overflow-x-auto text-stone-600 dark:text-stone-300 whitespace-pre-wrap break-all">
                      {hardwarePretty}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* ── Existing rejection reason (read-only, REJECTED state) ── */}
            {verif.status === "REJECTED" && verif.rejection_reason && (
              <>
                <Separator className="dark:bg-[#2a2d3e]" />
                <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3.5 space-y-1.5">
                  <SectionLabel>Rejection Reason</SectionLabel>
                  <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                    {verif.rejection_reason}
                  </p>
                  {verif.reviewed_by && (
                    <p className="text-[10px] text-red-400 dark:text-red-500 mt-1">
                      By {verif.reviewed_by} · {verif.reviewed_at}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ════ RIGHT — ID images + reject input ════ */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

            {/* ID photo captures — larger for easier review */}
            <div>
              <SectionLabel>Uploaded Photos</SectionLabel>
              <div className="space-y-4">
                <IdImageCard label="ID — Front"              />
                <IdImageCard label="ID — Back"               />
                <IdImageCard label="Selfie while holding ID" />
              </div>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-2.5">
                Click any image to view full size · Served from secure storage
              </p>
            </div>

            {/* ── Reject reason field — visible for PENDING only ── */}
            {verif.status === "PENDING" && (
              <>
                <Separator className="dark:bg-[#2a2d3e]" />
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                    Rejection Reason
                    <span className="normal-case font-normal text-stone-400 dark:text-stone-600 ml-1.5">
                      — required to reject
                    </span>
                  </Label>
                  <Textarea
                    rows={4}
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Explain clearly why the submission is being rejected so the user can resubmit correctly…"
                    className="resize-none text-xs dark:bg-[#13151f] dark:border-[#2a2d3e] dark:text-stone-100 dark:placeholder-stone-600"
                  />
                  <p className="text-[10px] text-stone-400 dark:text-stone-500">
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
                disabled={!rejectReason.trim()}
                onClick={() => {
                  if (!rejectReason.trim()) return;
                  onReject(verif.id, rejectReason.trim());
                }}
                className="rounded-full border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 hover:border-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Reject
              </Button>
              <Button
                type="button"
                onClick={() => onApprove(verif.id)}
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
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page,         setPage]         = useState(1);
  const [selected,     setSelected]     = useState<AdminVerification | null>(null);
  const [records,      setRecords]      = useState<AdminVerification[]>(VERIFICATIONS);
  const PER_PAGE = 8;

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

  function handleApprove(id: string) {
    setRecords(rs => rs.map(r =>
      r.id === id
        ? { ...r, status: "VERIFIED" as VerifStatus, reviewed_by: "Admin One", reviewed_at: new Date().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) }
        : r,
    ));
    setSelected(null);
  }

  function handleReject(id: string, reason: string) {
    setRecords(rs => rs.map(r =>
      r.id === id
        ? { ...r, status: "REJECTED" as VerifStatus, rejection_reason: reason, reviewed_by: "Admin One", reviewed_at: new Date().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) }
        : r,
    ));
    setSelected(null);
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
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">ID Type</TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Status</TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">Submitted</TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest whitespace-nowrap">Reviewed By</TableHead>
                  <TableHead className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 ? (
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
                        <TableCell className="py-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3a4a6a] to-[#1e2a40] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                              {verif.user_name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{verif.user_name}</p>
                              <p className="text-xs text-stone-400 dark:text-stone-500">{verif.user_email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-[#13151f] px-2 py-1 rounded-lg">
                            <IdCard className="w-3 h-3 text-stone-400" /> {verif.id_type}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 whitespace-nowrap">
                          <span className={cn("inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full", sc.cls)}>
                            <StatusIcon className="w-2.5 h-2.5" /> {sc.label}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                          {verif.submitted_at}
                        </TableCell>
                        <TableCell className="py-3.5 text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap">
                          {verif.reviewed_by
                            ? <div className="leading-tight"><p className="text-sm font-semibold">{verif.reviewed_by}</p><p>{verif.reviewed_at}</p></div>
                            : <span className="text-stone-300 dark:text-stone-600">Not yet reviewed</span>
                          }
                        </TableCell>
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
        />
      )}
    </div>
  );
}
