"use client";

import Link from "next/link";
import { ArrowRight, FileText, Headset, Mail, ShieldAlert } from "lucide-react";

const SUPPORT_STEPS = [
  {
    title: "Submit an Appeal",
    description: "Tell us why your account should be restored and share any supporting details.",
    Icon: FileText,
  },
  {
    title: "Super Admin Review",
    description: "The ticket appears in the admin appeals queue for review and a decision.",
    Icon: ShieldAlert,
  },
  {
    title: "Email Notification",
    description: "You will receive an update once your appeal has been reviewed.",
    Icon: Mail,
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-stone-100 dark:bg-[#0f1117]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
        <section className="rounded-3xl border border-stone-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1c1f2e] overflow-hidden">
          <div className="bg-linear-to-r from-[#1e2433] via-[#2b3852] to-[#1e2433] px-6 sm:px-8 py-10 sm:py-12">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                <Headset className="w-3.5 h-3.5" />
                Support Center
              </div>
              <h1 className="mt-4 text-3xl sm:text-4xl font-black text-white leading-tight">
                Need help with a disabled or locked account?
              </h1>
              <p className="mt-3 max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed">
                Start an appeal and we&apos;ll route it into the admin review flow for a decision and follow-up.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/appeal"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors"
                >
                  Submit an Appeal
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5 transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SUPPORT_STEPS.map(({ title, description, Icon }) => (
            <div
              key={title}
              className="rounded-2xl border border-stone-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1c1f2e] p-5"
            >
              <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-stone-900 dark:text-stone-100">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{description}</p>
            </div>
          ))}
        </section>

      </div>
    </div>
  );
}
