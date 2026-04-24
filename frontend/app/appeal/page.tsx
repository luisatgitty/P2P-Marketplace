"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileText, Mail, Send, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/utils/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAppealsByEmail, submitAppeal } from "@/services/appealsService";
import type { AppealCategory, AppealTicket } from "@/types/appeal";

const CATEGORY_OPTIONS: Array<{ value: AppealCategory; label: string }> = [
  { value: "ACCOUNT_DEACTIVATION", label: "Account Deactivation" },
  { value: "ACCOUNT_LOCKED", label: "Locked Account" },
  { value: "VERIFICATION_REVIEW", label: "Verification Review" },
  { value: "OTHER", label: "Other" },
];

const STATUS_STYLES = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  REACTIVATED: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  DECLINED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
} as const;

export default function AppealPage() {
  const { user } = useUser();
  const defaultName = useMemo(() => `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(), [user]);
  const defaultEmail = user?.email ?? "";
  const defaultPhone = user?.phoneNumber ?? "";

  const [fullName, setFullName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(defaultPhone);
  const [category, setCategory] = useState<AppealCategory>("ACCOUNT_DEACTIVATION");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<AppealTicket | null>(null);
  const [recentAppeals, setRecentAppeals] = useState<AppealTicket[]>([]);

  useEffect(() => {
    setFullName((current) => current || defaultName);
    setEmail((current) => current || defaultEmail);
    setPhone((current) => current || defaultPhone);
  }, [defaultEmail, defaultName, defaultPhone]);

  useEffect(() => {
    const loadRecentAppeals = async () => {
      if (!email.trim()) {
        setRecentAppeals([]);
        return;
      }

      const appeals = await getAppealsByEmail(email);
      setRecentAppeals(appeals);
    };

    void loadRecentAppeals();
  }, [email, submittedTicket]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!fullName.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast.error("Please complete the required fields.", { position: "top-center" });
      return;
    }

    setSubmitting(true);
    try {
      const created = await submitAppeal({
        userId: user?.userId ?? null,
        fullName,
        email,
        phone,
        category,
        subject,
        message,
        evidenceUrl,
      });

      setSubmittedTicket(created);
      setSubject("");
      setMessage("");
      setEvidenceUrl("");
      toast.success(`Appeal submitted. Ticket ${created.ticket_number} is now in the admin queue.`, { position: "top-center" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit appeal.";
      toast.error(message, { position: "top-center" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-[#0f1117]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <section className="rounded-3xl border border-stone-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1c1f2e] overflow-hidden">
          <div className="bg-[#1e2433] px-6 sm:px-8 py-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Appeal Form</p>
            <h1 className="mt-3 text-3xl font-black text-white">Submit an account appeal</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 leading-relaxed">
              Share what happened, why your account should be restored, and any details that can help the review.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700 dark:text-stone-200">Full name</label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700 dark:text-stone-200">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700 dark:text-stone-200">Phone number</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700 dark:text-stone-200">Appeal category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AppealCategory)}
                  className="w-full h-10 rounded-md border border-stone-200 dark:border-[#2a2d3e] bg-white dark:bg-[#13151f] px-3 text-sm text-stone-700 dark:text-stone-200 outline-none focus:border-stone-400"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700 dark:text-stone-200">Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Example: Request to reactivate my marketplace account"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700 dark:text-stone-200">Appeal details</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain what happened, what changed, and why your account should be restored."
                className="min-h-36"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700 dark:text-stone-200">Evidence link</label>
              <Input
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="Optional link to screenshots, documents, or cloud folder"
              />
            </div>

            <div className="rounded-2xl border border-dashed border-stone-300 dark:border-[#374055] bg-stone-50 dark:bg-[#13151f] p-4">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">Decision updates</p>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                    Once your appeal is reviewed, you&apos;ll receive an update about the decision on your request.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#1e2433] hover:bg-[#2b3852] text-white"
              >
                <Send className="w-4 h-4" />
                {submitting ? "Submitting..." : "Submit Appeal"}
              </Button>
              <Link
                href="/support"
                className="inline-flex items-center justify-center rounded-md border border-stone-200 dark:border-[#2a2d3e] px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-[#13151f] transition-colors"
              >
                Back to Support
              </Link>
            </div>
          </form>
        </section>

        <aside className="space-y-5">
          <div className="rounded-3xl border border-stone-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1c1f2e] p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">What happens next?</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">Review process</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {[
                "Your ticket is submitted to the appeals queue.",
                "A Super Admin can review it from the admin appeals page.",
                "You will receive a decision update after the review.",
              ].map((step) => (
                <div key={step} className="flex items-start gap-2 text-sm text-stone-600 dark:text-stone-400">
                  <span className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {submittedTicket && (
            <div className="rounded-3xl border border-teal-200 dark:border-teal-900/40 bg-teal-50 dark:bg-teal-950/10 p-5">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <div>
                  <p className="text-sm font-bold text-teal-800 dark:text-teal-300">Appeal received</p>
                  <p className="text-xs text-teal-700/80 dark:text-teal-400">Ticket {submittedTicket.ticket_number}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-teal-800 dark:text-teal-300 leading-relaxed">
                Your submission is now visible in the admin dashboard appeals queue.
              </p>
            </div>
          )}

          <div className="rounded-3xl border border-stone-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1c1f2e] p-5">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-stone-500" />
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100">Recent appeals for this email</p>
            </div>
            <div className="mt-4 space-y-3">
              {recentAppeals.length === 0 ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">No appeal tickets yet.</p>
              ) : (
                recentAppeals.slice(0, 4).map((appeal) => (
                  <div key={appeal.id} className="rounded-2xl border border-stone-200 dark:border-[#2a2d3e] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-stone-500 dark:text-stone-400">{appeal.ticket_number}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLES[appeal.status]}`}>
                        {appeal.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-stone-900 dark:text-stone-100">{appeal.subject}</p>
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                      Submitted {new Date(appeal.created_at).toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
