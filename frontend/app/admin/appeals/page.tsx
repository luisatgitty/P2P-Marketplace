"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Mail,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/utils/UserContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getAppealEmailPreview,
  getAppealSummary,
  getAppeals,
  reviewAppeal,
} from "@/services/appealsService";
import type { AppealCategory, AppealSummary, AppealTicket } from "@/types/appeal";

const STATUS_CLASS = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  REACTIVATED: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  DECLINED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
} as const;

const CATEGORY_LABEL: Record<AppealCategory, string> = {
  ACCOUNT_DEACTIVATION: "Account Deactivation",
  ACCOUNT_LOCKED: "Account Locked",
  VERIFICATION_REVIEW: "Verification Review",
  OTHER: "Other",
};

const EMPTY_SUMMARY: AppealSummary = {
  total: 0,
  pending: 0,
  reactivated: 0,
  declined: 0,
};

const APPEAL_REASON_PRESETS: Record<"REACTIVATE" | "DECLINE", string[]> = {
  REACTIVATE: [
    "the user provided enough clarification and supporting context",
    "the account issue appears to have been resolved",
    "the restriction was reviewed and qualified for restoration",
    "the submitted documents matched the account details",
    "the user acknowledged the policy and agreed to comply moving forward",
  ],
  DECLINE: [
    "the submitted explanation did not provide enough supporting evidence",
    "the account still has unresolved policy concerns",
    "the appeal did not meet the reactivation requirements at this time",
    "the provided documents were incomplete or inconsistent",
    "additional review details are still required before restoration can be considered",
  ],
};

function buildAppealDecisionTemplate(
  appeal: AppealTicket,
  resolution: "REACTIVATE" | "DECLINE",
) {
  if (resolution === "REACTIVATE") {
    return `Your appeal has been reviewed and reactivated for the reason: [add reason here].`;
  }

  return `Your appeal has been reviewed and declined for the reason: [add reason here].`;
}

function fillAppealDecisionTemplate(
  appeal: AppealTicket,
  resolution: "REACTIVATE" | "DECLINE",
  reason: string,
) {
  if (resolution === "REACTIVATE") {
    return `Your appeal has been reviewed and reactivated for the reason: ${reason}.`;
  }

  return `Your appeal has been reviewed and declined for the reason: ${reason}.`;
}

export default function AdminAppealsPage() {
  const { user } = useUser();
  const currentRole = String(user?.role ?? "").toUpperCase();
  const isSuperAdmin = currentRole === "SUPER_ADMIN";

  const [appeals, setAppeals] = useState<AppealTicket[]>([]);
  const [summary, setSummary] = useState<AppealSummary>(EMPTY_SUMMARY);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | AppealTicket["status"]>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | AppealCategory>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [draftResolution, setDraftResolution] = useState<"REACTIVATE" | "DECLINE">("REACTIVATE");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<"REACTIVATE" | "DECLINE" | null>(null);

  const selectedAppeal = appeals.find((appeal) => appeal.id === selectedId) ?? null;

  const loadAppeals = useCallback(async () => {
    setLoading(true);
    try {
      const [appealsResponse, nextSummary] = await Promise.all([
        getAppeals({
          search,
          status: statusFilter,
          category: categoryFilter,
        }),
        getAppealSummary(),
      ]);

      setAppeals(appealsResponse.appeals);
      setSummary(nextSummary);

      const nextSelected =
        appealsResponse.appeals.find((appeal) => appeal.id === selectedId) ??
        appealsResponse.appeals[0] ??
        null;
      setSelectedId(nextSelected?.id ?? null);
      setAdminNote(nextSelected?.admin_note ?? "");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load appeals.";
      toast.error(message, { position: "top-center" });
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, search, selectedId, statusFilter]);

  useEffect(() => {
    void loadAppeals();
  }, [loadAppeals]);


  useEffect(() => {
    setAdminNote(selectedAppeal?.admin_note ?? "");
    setDraftResolution(selectedAppeal?.status === "DECLINED" ? "DECLINE" : "REACTIVATE");
  }, [selectedId, selectedAppeal?.admin_note, selectedAppeal?.status]);

  const emailPreview = useMemo(() => {
    if (!selectedAppeal) return null;
    return getAppealEmailPreview(
      selectedAppeal,
      draftResolution,
      adminNote,
    );
  }, [adminNote, draftResolution, selectedAppeal]);

  function applyDecisionTemplate(resolution: "REACTIVATE" | "DECLINE") {
    if (!selectedAppeal || selectedAppeal.status !== "PENDING") return;
    setDraftResolution(resolution);
    setAdminNote(buildAppealDecisionTemplate(selectedAppeal, resolution));
  }

  function applyReasonPreset(reason: string) {
    if (!selectedAppeal || selectedAppeal.status !== "PENDING") return;
    setAdminNote(fillAppealDecisionTemplate(selectedAppeal, draftResolution, reason));
  }

  async function handleDecision(decision: "REACTIVATE" | "DECLINE") {
    if (!selectedAppeal) return;

    if (!adminNote.trim()) {
      toast.error("Add an admin note before completing the review.", { position: "top-center" });
      return;
    }

    setActing(decision);
    try {
      const updated = await reviewAppeal(selectedAppeal.id, {
        resolution: decision,
        adminNote,
      });

      setAppeals((current) => current.map((appeal) => (
        appeal.id === updated.id ? updated : appeal
      )));
      setSelectedId(updated.id);
      setSummary(await getAppealSummary());
      toast.success(
        decision === "REACTIVATE"
          ? "Appeal approved. Email notification is ready for backend delivery."
          : "Appeal declined. Email notification preview is ready.",
        { position: "top-center" },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to review appeal.";
      toast.error(message, { position: "top-center" });
    } finally {
      setActing(null);
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-5 sm:p-6">
        <div className="rounded-3xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/10 p-6">
          <p className="text-lg font-bold text-amber-800 dark:text-amber-300">Super Admin access required</p>
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            Appeal reviews are limited to Super Admin accounts. Only that role should approve reactivation requests.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-50">Appeals</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">Review user reactivation requests and complete appeal decisions.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Tickets", value: summary.total, tone: "text-stone-700 dark:text-stone-200" },
          { label: "Pending Review", value: summary.pending, tone: "text-amber-600 dark:text-amber-400" },
          { label: "Reactivated", value: summary.reactivated, tone: "text-teal-600 dark:text-teal-400" },
          { label: "Declined", value: summary.declined, tone: "text-red-600 dark:text-red-400" },
        ].map((card) => (
          <Card key={card.label} className="border-stone-200 dark:border-[#2a2d3e]">
            <CardContent className="p-4">
              <p className="text-sm text-stone-500 dark:text-stone-400">{card.label}</p>
              <p className={`mt-2 text-3xl font-black ${card.tone}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5">
        <Card className="border-stone-200 dark:border-[#2a2d3e]">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by ticket, user, email, or subject"
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "ALL" | AppealTicket["status"])}
                  className="h-10 rounded-md border border-stone-200 dark:border-[#2a2d3e] bg-white dark:bg-[#13151f] px-3 text-sm"
                >
                  <option value="ALL">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="REACTIVATED">Reactivated</option>
                  <option value="DECLINED">Declined</option>
                </select>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as "ALL" | AppealCategory)}
                  className="h-10 rounded-md border border-stone-200 dark:border-[#2a2d3e] bg-white dark:bg-[#13151f] px-3 text-sm"
                >
                  <option value="ALL">All categories</option>
                  <option value="ACCOUNT_DEACTIVATION">Account Deactivation</option>
                  <option value="ACCOUNT_LOCKED">Account Locked</option>
                  <option value="VERIFICATION_REVIEW">Verification Review</option>
                  <option value="OTHER">Other</option>
                </select>
                <Button type="button" variant="outline" onClick={() => void loadAppeals()} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {appeals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 dark:border-[#374055] p-6 text-sm text-stone-500 dark:text-stone-400">
                  No appeal tickets found yet. Submit one from the support flow to populate this queue.
                </div>
              ) : (
                appeals.map((appeal) => (
                  <button
                    key={appeal.id}
                    type="button"
                    onClick={() => setSelectedId(appeal.id)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all ${
                      selectedId === appeal.id
                        ? "border-[#1e2433] dark:border-stone-200 bg-stone-50 dark:bg-[#13151f]"
                        : "border-stone-200 dark:border-[#2a2d3e] hover:border-stone-400 dark:hover:border-[#44506b]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-stone-500 dark:text-stone-400">{appeal.ticket_number}</p>
                        <p className="mt-1 text-sm font-bold text-stone-900 dark:text-stone-100">{appeal.subject}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_CLASS[appeal.status]}`}>
                        {appeal.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                      <span>{appeal.full_name}</span>
                      <span>{appeal.email}</span>
                      <span>{CATEGORY_LABEL[appeal.category]}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200 dark:border-[#2a2d3e]">
          <CardContent className="p-5 space-y-5">
            {!selectedAppeal ? (
              <div className="rounded-2xl border border-dashed border-stone-300 dark:border-[#374055] p-6 text-sm text-stone-500 dark:text-stone-400">
                Select an appeal ticket to review its details.
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-stone-500 dark:text-stone-400">{selectedAppeal.ticket_number}</p>
                    <h3 className="mt-1 text-lg font-black text-stone-900 dark:text-stone-100">{selectedAppeal.subject}</h3>
                    <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{CATEGORY_LABEL[selectedAppeal.category]}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_CLASS[selectedAppeal.status]}`}>
                    {selectedAppeal.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-stone-50 dark:bg-[#13151f] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Requester</p>
                    <p className="mt-1 text-sm font-semibold text-stone-900 dark:text-stone-100">{selectedAppeal.full_name}</p>
                    <p className="text-sm text-stone-600 dark:text-stone-400">{selectedAppeal.email}</p>
                  </div>
                  <div className="rounded-2xl bg-stone-50 dark:bg-[#13151f] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Submitted</p>
                    <p className="mt-1 text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {new Date(selectedAppeal.created_at).toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" })}
                    </p>
                    <p className="text-sm text-stone-600 dark:text-stone-400">{selectedAppeal.phone || "No phone provided"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Appeal message</p>
                  <div className="mt-2 rounded-2xl border border-stone-200 dark:border-[#2a2d3e] p-4 text-sm leading-relaxed text-stone-700 dark:text-stone-300 whitespace-pre-wrap">
                    {selectedAppeal.message}
                  </div>
                </div>

                {selectedAppeal.evidence_url && (
                  <div>
                    <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Evidence link</p>
                    <a
                      href={selectedAppeal.evidence_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-sm text-blue-600 dark:text-blue-400 underline underline-offset-2"
                    >
                      {selectedAppeal.evidence_url}
                    </a>
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Admin note</p>
                  {selectedAppeal.status === "PENDING" && (
                    <div className="mt-2 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => applyDecisionTemplate("REACTIVATE")}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                            draftResolution === "REACTIVATE"
                              ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                              : "bg-stone-100 text-stone-600 dark:bg-[#1c2231] dark:text-stone-300"
                          }`}
                        >
                          Use Reactivate Statement
                        </button>
                        <button
                          type="button"
                          onClick={() => applyDecisionTemplate("DECLINE")}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                            draftResolution === "DECLINE"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              : "bg-stone-100 text-stone-600 dark:bg-[#1c2231] dark:text-stone-300"
                          }`}
                        >
                          Use Decline Statement
                        </button>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                          Quick Reasons
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {APPEAL_REASON_PRESETS[draftResolution].map((reason) => (
                            <button
                              key={reason}
                              type="button"
                              onClick={() => applyReasonPreset(reason)}
                              className="rounded-full border border-stone-200 dark:border-[#2a2d3e] bg-white dark:bg-[#161b28] px-3 py-1.5 text-xs text-stone-700 dark:text-stone-200 hover:border-stone-400 dark:hover:border-[#44506b] transition-colors"
                            >
                              {reason}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <Textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Your appeal has been reviewed and reactivated/declined for the reason: ..."
                    className="mt-2 min-h-28"
                    disabled={selectedAppeal.status !== "PENDING"}
                  />
                </div>

                <div className="rounded-2xl border border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f] p-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-stone-500" />
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-100">Email notification preview</p>
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Subject</p>
                  <p className="mt-1 text-sm text-stone-800 dark:text-stone-200">{emailPreview?.subject ?? "No preview available"}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Body</p>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{emailPreview?.body ?? "No preview available"}</p>
                  <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
                    Current delivery state: {selectedAppeal.email_notification_status}.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    onClick={() => void handleDecision("REACTIVATE")}
                    disabled={selectedAppeal.status !== "PENDING" || acting !== null}
                    className="bg-teal-600 hover:bg-teal-500 text-white"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {acting === "REACTIVATE" ? "Reactivating..." : "Reactivate"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleDecision("DECLINE")}
                    disabled={selectedAppeal.status !== "PENDING" || acting !== null}
                    className="bg-red-600 hover:bg-red-500 text-white"
                  >
                    <XCircle className="w-4 h-4" />
                    {acting === "DECLINE" ? "Declining..." : "Decline"}
                  </Button>
                </div>

                {selectedAppeal.reviewed_by && (
                  <div className="rounded-2xl bg-stone-50 dark:bg-[#13151f] p-4 text-sm text-stone-600 dark:text-stone-400">
                    Reviewed by <span className="font-semibold text-stone-900 dark:text-stone-100">{selectedAppeal.reviewed_by}</span>
                    {selectedAppeal.reviewed_at ? ` on ${new Date(selectedAppeal.reviewed_at).toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" })}` : ""}.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
