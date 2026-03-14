"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useUser } from "@/utils/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type VerifyStep = 1 | 2 | 3 | 4;
type DocType = "philsys" | "passport" | "drivers" | "sss" | "voters" | "other" | null;

export default function BecomeSellerPage() {
  const { user, saveUserData } = useUser();

  const [step, setStep] = useState<VerifyStep>(1);
  const [agreed, setAgreed] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocType>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const verificationState = useMemo(() => (user?.status ?? "").toLowerCase(), [user?.status]);
  const TOTAL = 4;

  function showToastMessage(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2600);
  }

  function next() {
    if (step === 1 && !agreed) return;
    if (step < TOTAL) {
      setStep((prev) => (prev + 1) as VerifyStep);
      return;
    }

    setSubmitted(true);
    if (user) {
      saveUserData({ ...user, status: "PENDING" });
    }
    showToastMessage("🎉 Application submitted! Under review.");
  }

  function prev() {
    if (step > 1) setStep((prev) => (prev - 1) as VerifyStep);
  }

  const docOptions = [
    { key: "philsys" as DocType, icon: "🆔", label: "PhilSys" },
    { key: "passport" as DocType, icon: "📒", label: "Passport" },
    { key: "drivers" as DocType, icon: "🚗", label: "Driver's License" },
    { key: "sss" as DocType, icon: "🪙", label: "SSS / GSIS" },
    { key: "voters" as DocType, icon: "🗳️", label: "Voter's ID" },
    { key: "other" as DocType, icon: "📄", label: "Other Gov't ID" },
  ];

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-[#0f1117] py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <Link href="/profile" className="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200">
            ← Back to Profile
          </Link>
        </div>

        {verificationState === "verified" ? (
          <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] p-6 text-center">
            <p className="text-3xl mb-2">👑</p>
            <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">You are already a verified seller</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-2">You can post listings anytime.</p>
            <Link href="/create">
              <Button className="mt-5 bg-stone-900 hover:bg-stone-800 text-white">Post a Listing</Button>
            </Link>
          </div>
        ) : verificationState === "pending" || submitted ? (
          <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] p-6 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">Application In Review</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-2">Your seller application is being reviewed. We'll notify you in 1–2 business days.</p>
            <Link href="/profile">
              <Button variant="outline" className="mt-5 dark:border-[#2a2d3e] dark:text-stone-300">Go to Profile</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl overflow-hidden border border-stone-200 dark:border-[#2a2d3e] shadow-sm">
            <div className="bg-[#1e2433] px-7 py-5">
              <h1 className="text-white font-bold text-xl">Become a Seller</h1>
              <p className="text-slate-400 text-sm mt-1">Complete 3 quick steps to get verified</p>
              <div className="flex gap-1.5 mt-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors duration-300",
                      i < step ? "bg-teal-400" : i === step ? "bg-amber-400" : "bg-white/20",
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="p-7">
              {step === 1 ? (
                <>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base mb-1">What you'll need 📋</h3>
                  <p className="text-sm text-stone-500 dark:text-stone-400 mb-5 leading-relaxed">To become a verified seller, we'll need a few things to confirm your identity.</p>
                  <div className="flex flex-col gap-3 mb-5">
                    {[
                      { icon: "🪪", title: "Government-Issued ID", desc: "PhilSys, Passport, Driver's License, SSS, GSIS, or Voter's ID" },
                      { icon: "🤳", title: "Selfie with your ID", desc: "A clear photo of you holding your ID for liveness verification" },
                      { icon: "📞", title: "Verified Phone Number", desc: "A valid PH mobile number for OTP verification and buyer contact" },
                    ].map((item) => (
                      <div key={item.title} className="flex items-start gap-3 p-4 border border-stone-200 dark:border-[#2a2d3e] rounded-xl bg-stone-50 dark:bg-[#13151f]">
                        <span className="text-xl shrink-0">{item.icon}</span>
                        <div>
                          <p className="font-semibold text-sm text-stone-800 dark:text-stone-200">{item.title}</p>
                          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-teal-600" />
                    <span className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                      I agree to the Seller Terms of Service and confirm I am at least 18 years old and a resident of the Philippines.
                    </span>
                  </label>
                </>
              ) : step === 2 ? (
                <>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base mb-1">Upload your ID 🪪</h3>
                  <p className="text-sm text-stone-500 dark:text-stone-400 mb-4 leading-relaxed">Select an ID type and upload a clear, well-lit photo.</p>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {docOptions.map((doc) => (
                      <button
                        key={doc.key}
                        onClick={() => setSelectedDoc(doc.key)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all",
                          selectedDoc === doc.key
                            ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-stone-800 dark:text-stone-200"
                            : "border-stone-200 dark:border-[#2a2d3e] text-stone-500 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600",
                        )}
                      >
                        <span className="text-lg">{doc.icon}</span>
                        {doc.label}
                      </button>
                    ))}
                  </div>
                  <div className="border-2 border-dashed border-stone-200 dark:border-[#2a2d3e] rounded-xl p-8 text-center">
                    <p className="text-sm font-medium text-stone-600 dark:text-stone-300">Upload front of ID</p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">JPG, PNG or PDF · Max 5MB</p>
                  </div>
                </>
              ) : step === 3 ? (
                <>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base mb-1">Selfie with your ID 🤳</h3>
                  <p className="text-sm text-stone-500 dark:text-stone-400 mb-4 leading-relaxed">Hold your ID clearly next to your face.</p>
                  <div className="border-2 border-dashed border-stone-200 dark:border-[#2a2d3e] rounded-xl p-8 text-center mb-3">
                    <p className="text-sm font-medium text-stone-600 dark:text-stone-300">Use camera or upload a photo</p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Face must match ID · No filters</p>
                  </div>
                  <div className="bg-stone-50 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl p-3 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    <strong className="text-stone-800 dark:text-stone-200">Tips:</strong> Good lighting · Both face and ID fully visible · No sunglasses
                  </div>
                </>
              ) : !showOtp ? (
                <>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base mb-1">Verify your phone 📞</h3>
                  <p className="text-sm text-stone-500 dark:text-stone-400 mb-5 leading-relaxed">Enter your Philippine mobile number.</p>
                  <div className="mb-4">
                    <label className="text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5 block">Mobile Number</label>
                    <div className="flex gap-2">
                      <div className="flex items-center justify-center bg-stone-100 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-lg px-3 text-sm text-stone-500 dark:text-stone-400 font-medium w-16 shrink-0">+63</div>
                      <Input type="tel" placeholder="9XX XXX XXXX" className="flex-1" />
                    </div>
                  </div>
                  <Button className="w-full bg-stone-900 hover:bg-stone-800 text-white" onClick={() => setShowOtp(true)}>Send OTP Code</Button>
                </>
              ) : (
                <>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base mb-1">Enter OTP 🔢</h3>
                  <p className="text-sm text-stone-500 dark:text-stone-400 mb-5">We sent a 6-digit code to your number.</p>
                  <div className="flex justify-center gap-2 mb-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <input
                        key={i}
                        maxLength={1}
                        className="w-10 h-11 rounded-lg border border-stone-200 dark:border-[#2a2d3e] bg-stone-50 dark:bg-[#13151f] text-center text-lg font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-400 dark:focus:border-stone-500"
                      />
                    ))}
                  </div>
                  <p className="text-center text-xs text-stone-400 dark:text-stone-500">Didn't receive a code? Resend in 0:45</p>
                </>
              )}

              <div className="flex items-center justify-between mt-6 pt-5 border-t border-stone-200 dark:border-[#2a2d3e]">
                <span className="text-xs text-stone-400 dark:text-stone-500">Step {step} of {TOTAL}</span>
                <div className="flex gap-2">
                  {step > 1 && (
                    <Button variant="outline" onClick={prev} className="text-sm dark:border-[#2a2d3e] dark:text-stone-300 dark:hover:bg-[#252837]">
                      ← Back
                    </Button>
                  )}
                  <Button className="bg-stone-900 hover:bg-stone-800 text-white text-sm" onClick={next} disabled={step === 1 && !agreed}>
                    {step === TOTAL ? "Submit Application" : "Continue →"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          {toast}
        </div>
      )}
    </div>
  );
}
