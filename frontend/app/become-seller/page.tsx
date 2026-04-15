"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useEffect } from "react";
import { useUser }           from "@/utils/UserContext";
import { Button }            from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input }             from "@/components/ui/input";
import { Label }             from "@/components/ui/label";
import { NumberInput }       from "@/components/ui/number-input";
import { Separator }         from "@/components/ui/separator";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  CreditCard,
  Crown,
  Hourglass,
  IdCard,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { getDeviceInfo } from "@/utils/device";
import {
  submitVerification,
  type VerificationImagePayload,
  // ── NEW: import the two OTP functions added to verificationService.ts ──
  sendPhoneOTP,
  verifyPhoneOTP,
} from "@/services/verificationService";
import {
  AUTH_LIMITS,
  LISTING_LIMITS,
  VERIFICATION_ID_TYPES,
  VERIFICATION_LIMITS,
  isValidName,
} from "@/utils/validation";

// ── Types ──────────────────────────────────────────────────────────────────────
type VerifyStep = 1 | 2 | 3;
type IdType     =
  | "" | "philsys" | "postal" | "drivers" | "prc"
  | "passport" | "sss" | "gsis" | "hdmf" | "voters" | "acr";

const ID_OPTIONS: { value: IdType; label: string }[] = [
  { value: "",         label: "Select an ID type…"  },
  { value: "philsys",  label: "National ID"         },
  { value: "postal",   label: "Postal ID"           },
  { value: "drivers",  label: "Driver's License"    },
  { value: "prc",      label: "PRC ID"              },
  { value: "passport", label: "Passport"            },
  { value: "sss",      label: "UMID / SSS ID"       },
  { value: "gsis",     label: "GSIS ID"             },
  { value: "hdmf",     label: "HDMF ID"             },
  { value: "voters",   label: "Voter's ID"          },
  { value: "acr",      label: "ACR (Foreigners)"    },
];

const TOTAL            = 3;
const OTP_LENGTH       = 6;
const RESEND_SECONDS   = 45;
const PHONE_DIGITS     = 10;
const VERIFICATION_IMAGE_MAX_DIMENSION = 1400;
const VERIFICATION_IMAGE_QUALITY = 0.8;

const device = getDeviceInfo();
// NOTE: Temporary override to bypass device check during development.
// Remove this line in production.
device.isMobile = true;

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatCountdown(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

function normalizeToLocalPhoneDigits(value?: string | null): string {
  const digitsOnly = (value ?? "").replace(/\D/g, "");
  if (!digitsOnly) return "";
  if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) return digitsOnly.slice(1);
  if (digitsOnly.length === 10 && digitsOnly.startsWith("9")) return digitsOnly;
  if (digitsOnly.length === 12 && digitsOnly.startsWith("63")) return digitsOnly.slice(2);
  return "";
}

async function compressVerificationImage(file: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, VERIFICATION_IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width  = Math.max(1, Math.round(bitmap.width  * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas  = document.createElement("canvas");
    canvas.width  = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Failed to initialize image compression canvas.");
    context.drawImage(bitmap, 0, 0, width, height);
    const compressed = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(output => resolve(output), "image/webp", VERIFICATION_IMAGE_QUALITY);
    });
    if (!compressed) throw new Error("Failed to compress image.");
    return compressed;
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const data   = result.split(",")[1] ?? "";
      if (!data) { reject(new Error("Failed to encode image.")); return; }
      resolve(data);
    };
    reader.onerror = () => reject(new Error("Failed to read image data."));
    reader.readAsDataURL(blob);
  });
}

async function fileToVerificationImagePayload(file: File, fieldName: string): Promise<VerificationImagePayload> {
  const compressed = await compressVerificationImage(file);
  const data       = await blobToBase64(compressed);
  return { name: `${fieldName}.webp`, mimeType: "image/webp", data };
}

// ── CameraInput ────────────────────────────────────────────────────────────────
interface CameraInputProps {
  label:    string;
  capture:  "environment" | "user";
  file:     File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (f: File | null) => void;
}

function CameraInput({ label, capture, file, inputRef, onChange }: CameraInputProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
        {label} <span className="text-red-500">*</span>
      </Label>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => e.key === "Enter" && inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
          file
            ? "border-teal-400 bg-teal-50 dark:bg-teal-950/20"
            : "border-stone-200 dark:border-[#2a2d3e] hover:border-stone-400 dark:hover:border-stone-500 bg-stone-50 dark:bg-[#13151f]",
        )}
      >
        {file ? (
          <>
            <CheckCircle2 className="w-7 h-7 text-teal-500 dark:text-teal-400" />
            <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 text-center truncate max-w-full px-2">
              {file.name}
            </p>
            <p className="text-[10px] text-stone-400 dark:text-stone-500">Tap to retake</p>
          </>
        ) : (
          <>
            <Camera className="w-6 h-6 text-stone-400 dark:text-stone-500" />
            <p className="text-sm font-medium text-stone-600 dark:text-stone-300">Tap to open camera</p>
            <p className="text-xs text-stone-400 dark:text-stone-500">Camera opens automatically</p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={capture}
        className="hidden"
        onChange={e => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function BecomeSellerPage() {
  const { user, saveUserData } = useUser();

  // Device
  const [isMobile,  setIsMobile]  = useState(false);

  // Flow
  const [step,       setStep]      = useState<VerifyStep>(1);
  const [agreed,     setAgreed]    = useState(false);
  const [submitted,  setSubmitted] = useState(false);
  const [showOtp,    setShowOtp]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── NEW: OTP loading states ────────────────────────────────────────────────
  // Tracks the "Send OTP Code" and "Resend" button loading states separately
  // so the user gets visual feedback while the Twilio API call is in-flight.
  const [sendingOtp,    setSendingOtp]    = useState(false);
  // Tracks whether the OTP has been cryptographically verified by the backend.
  // The Submit button only becomes active after this is true.
  const [otpVerified,   setOtpVerified]   = useState(false);
  // Tracks the "verifying…" state while the verify API call is in-flight.
  const [verifyingOtp,  setVerifyingOtp]  = useState(false);

  // Step 2 form fields
  const [idType,    setIdType]    = useState<IdType>("");
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [dob,       setDob]       = useState("");
  const [idNumber,  setIdNumber]  = useState("");
  const [idFront,   setIdFront]   = useState<File | null>(null);
  const [idBack,    setIdBack]    = useState<File | null>(null);
  const [selfie,    setSelfie]    = useState<File | null>(null);
  const [step2Err,  setStep2Err]  = useState("");

  // Step 3 — phone + OTP
  const [phoneNumber,   setPhoneNumber]   = useState("");
  const [otpValue,      setOtpValue]      = useState("");
  const [resendSeconds, setResendSeconds] = useState(RESEND_SECONDS);
  const [canResend,     setCanResend]     = useState(false);
  const [resendKey,     setResendKey]     = useState(0);
  const hasPrefilledPhone = useRef(false);

  const frontRef  = useRef<HTMLInputElement>(null);
  const backRef   = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  const verificationState = useMemo(
    () => (user?.status ?? "").toLowerCase(),
    [user?.status],
  );

  const hasPhoneNumber         = Boolean((user?.phoneNumber ?? "").trim());
  const hasFullLocation        = [user?.locationBrgy, user?.locationCity, user?.locationProv]
    .every(v => Boolean((v ?? "").trim()));
  const hasProfileSetupRequirement = hasPhoneNumber && hasFullLocation;

  // ── Derived booleans ────────────────────────────────────────────────────────
  const phoneComplete = phoneNumber.replace(/\D/g, "").length === PHONE_DIGITS;
  const otpComplete   = otpValue.length === OTP_LENGTH;

  // ── CHANGED: isNextDisabled now also requires otpVerified ──────────────────
  // Previously the form only checked otpComplete (the user just filled all 6 slots).
  // Now we require the backend to have confirmed the code is correct.
  const isNextDisabled =
    !isMobile                                         ||
    (step === 1 && (!agreed || !hasProfileSetupRequirement)) ||
    (step === 3 && !showOtp)                          ||
    (step === 3 && showOtp && !otpVerified)           || // ← changed from !otpComplete
    submitting;

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => { setIsMobile(device.isMobile); }, []);

  // Resend countdown
  useEffect(() => {
    if (!showOtp) return;
    setResendSeconds(RESEND_SECONDS);
    setCanResend(false);
    const id = setInterval(() => {
      setResendSeconds(prev => {
        if (prev <= 1) { clearInterval(id); setCanResend(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [showOtp, resendKey]);

  // ── ADDED: Auto-verify as soon as all 6 digits are typed ──────────────────
  // When the InputOTP component fires onChange with a complete 6-char value we
  // immediately call the verify endpoint.  This removes the need for a separate
  // "Verify" button — the UX is seamless.
  useEffect(() => {
    if (!showOtp || otpComplete === false || verifyingOtp || otpVerified) return;

    const digits = phoneNumber.replace(/\D/g, "");
    if (digits.length !== PHONE_DIGITS) return;

    void (async () => {
      setVerifyingOtp(true);
      try {
        await verifyPhoneOTP(digits, otpValue);
        // Code is correct — unlock the Submit button
        setOtpVerified(true);
        showToastMsg("Phone number verified ✓");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Incorrect code. Please try again.";
        // Wrong code, expired, or too many attempts
        toast.error(message, { position: "top-center" });
        // Clear the OTP field so the user can retype
        setOtpValue("");
        setOtpVerified(false);
      } finally {
        setVerifyingOtp(false);
      }
    })();
  // otpComplete is a derived boolean from otpValue, so including otpValue here
  // would cause a double-fire.  We intentionally only react to the completed state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpComplete, showOtp]);

  // Pre-fill phone from user profile
  useEffect(() => {
    if (hasPrefilledPhone.current) return;
    const normalized = normalizeToLocalPhoneDigits(user?.phoneNumber);
    if (!normalized) return;
    setPhoneNumber(normalized);
    hasPrefilledPhone.current = true;
  }, [user?.phoneNumber]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function showToastMsg(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  }

  function validateStep1(): string | null {
    if (!agreed) return "You need to agree to the Seller Terms of Service first.";

    const normalizedPhone = normalizeToLocalPhoneDigits(user?.phoneNumber);
    if (!normalizedPhone) return "Please add a valid Philippine mobile number in your profile.";

    const mobileNumber = `0${normalizedPhone}`;
    if (mobileNumber.length !== VERIFICATION_LIMITS.mobileNumberLength) {
      return `Mobile number must be exactly ${VERIFICATION_LIMITS.mobileNumberLength} digits.`;
    }

    const city = (user?.locationCity ?? "").trim();
    const province = (user?.locationProv ?? "").trim();
    const barangay = (user?.locationBrgy ?? "").trim();

    if (!city || city.length < LISTING_LIMITS.locationMinLength || city.length > LISTING_LIMITS.locationMaxLength) {
      return `Profile city must be between ${LISTING_LIMITS.locationMinLength} and ${LISTING_LIMITS.locationMaxLength} characters.`;
    }
    if (!province || province.length < LISTING_LIMITS.locationMinLength || province.length > LISTING_LIMITS.locationMaxLength) {
      return `Profile province must be between ${LISTING_LIMITS.locationMinLength} and ${LISTING_LIMITS.locationMaxLength} characters.`;
    }
    if (!barangay || barangay.length > LISTING_LIMITS.locationMaxLength) {
      return `Profile barangay must not exceed ${LISTING_LIMITS.locationMaxLength} characters.`;
    }

    return null;
  }

  function validateStep2(): string | null {
    const normalizedIdType = idType.trim();
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedIdNumber = idNumber.trim();

    if (!normalizedIdType) return "Please select an ID type.";
    if (
      normalizedIdType.length < VERIFICATION_LIMITS.idTypeMinLength ||
      normalizedIdType.length > VERIFICATION_LIMITS.idTypeMaxLength
    ) {
      return `ID type must be between ${VERIFICATION_LIMITS.idTypeMinLength} and ${VERIFICATION_LIMITS.idTypeMaxLength} characters.`;
    }
    if (!VERIFICATION_ID_TYPES.includes(normalizedIdType as (typeof VERIFICATION_ID_TYPES)[number])) {
      return "Invalid ID type selected.";
    }

    const firstNameError = isValidName(normalizedFirstName, "First name");
    if (firstNameError) return firstNameError;

    const lastNameError = isValidName(normalizedLastName, "Last name");
    if (lastNameError) return lastNameError;

    if (!dob.trim()) return "Date of birth is required.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return "Date of birth must use YYYY-MM-DD format.";
    const parsedDob = new Date(`${dob}T00:00:00`);
    if (Number.isNaN(parsedDob.getTime()) || parsedDob > new Date()) {
      return "Please enter a valid date of birth.";
    }

    if (!normalizedIdNumber) return "ID number is required.";
    if (normalizedIdNumber.length < VERIFICATION_LIMITS.idNumberMinLength) {
      return `ID number must be at least ${VERIFICATION_LIMITS.idNumberMinLength} characters.`;
    }
    if (normalizedIdNumber.length > VERIFICATION_LIMITS.idNumberMaxLength) {
      return `ID number must not exceed ${VERIFICATION_LIMITS.idNumberMaxLength} characters.`;
    }

    if (!(idFront instanceof File)) return "Front photo of your ID is required.";
    if (!(idBack  instanceof File)) return "Back photo of your ID is required.";
    if (!(selfie  instanceof File)) return "Selfie while holding your ID is required.";
    return null;
  }

  function validateStep3(): string | null {
    if (!showOtp) return "Please request an OTP code first.";
    if (!otpVerified) return "Please verify your OTP code before submitting.";

    const digits = phoneNumber.replace(/\D/g, "");
    if (digits.length !== PHONE_DIGITS) return "Please provide a valid Philippine mobile number.";

    const mobileNumber = `0${digits}`;
    if (mobileNumber.length !== VERIFICATION_LIMITS.mobileNumberLength) {
      return `Mobile number must be exactly ${VERIFICATION_LIMITS.mobileNumberLength} digits.`;
    }

    if (!(idFront instanceof File) || !(idBack instanceof File) || !(selfie instanceof File)) {
      return "All required verification images must be uploaded.";
    }

    return null;
  }

  // ── CHANGED: handleSendOtp now calls the real API ─────────────────────────
  async function handleSendOtp() {
    const digits = phoneNumber.replace(/\D/g, "");
    if (digits.length !== PHONE_DIGITS) return;

    setSendingOtp(true);
    try {
      // Collect session metadata the same way the rest of the form does
      const sessionRes = await fetch("/api/session", { credentials: "include" });
      const sessionMeta = sessionRes.ok
        ? (await sessionRes.json() as { ipAddress?: string; userAgent?: string })
        : {};

      await sendPhoneOTP(
        digits,
        (sessionMeta.ipAddress ?? "unknown").trim() || "unknown",
        (sessionMeta.userAgent ?? "unknown").trim() || "unknown",
      );

      // Only flip to OTP input AFTER the API confirms SMS was dispatched
      setOtpValue("");
      setOtpVerified(false);
      setShowOtp(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send OTP. Please try again.";
      toast.error(message, { position: "top-center" });
    } finally {
      setSendingOtp(false);
    }
  }

  // ── CHANGED: handleResend now also calls the real API ────────────────────
  async function handleResend() {
    if (!canResend) return;

    setSendingOtp(true);
    try {
      const sessionRes  = await fetch("/api/session", { credentials: "include" });
      const sessionMeta = sessionRes.ok
        ? (await sessionRes.json() as { ipAddress?: string; userAgent?: string })
        : {};

      const digits = phoneNumber.replace(/\D/g, "");

      await sendPhoneOTP(
        digits,
        (sessionMeta.ipAddress ?? "unknown").trim() || "unknown",
        (sessionMeta.userAgent ?? "unknown").trim() || "unknown",
      );

      setOtpValue("");
      setOtpVerified(false);
      setResendKey(k => k + 1); // restarts countdown via useEffect
      showToastMsg("New OTP sent to your number.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to resend OTP. Please try again.";
      toast.error(message, { position: "top-center" });
    } finally {
      setSendingOtp(false);
    }
  }

  async function next() {
    if (!device.isMobile) return;

    if (step === 1) {
      const err = validateStep1();
      if (err) {
        toast.error(err, { position: "top-center" });
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const err = validateStep2();
      if (err) { setStep2Err(err); return; }
      setStep2Err("");
      setStep(3);
      return;
    }

    const step3Error = validateStep3();
    if (step3Error) {
      toast.error(step3Error, { position: "top-center" });
      return;
    }

    const digits = phoneNumber.replace(/\D/g, "");
    const frontFile = idFront;
    const backFile = idBack;
    const selfieFile = selfie;
    if (!(frontFile instanceof File) || !(backFile instanceof File) || !(selfieFile instanceof File)) {
      throw new Error("Verification images are missing.");
    }

    setSubmitting(true);
    try {
      const sessionMetaResponse = await fetch("/api/session", {
        method: "GET",
        credentials: "include",
      });
      const sessionMeta = (await sessionMetaResponse.json()) as {
        ipAddress?: string;
        userAgent?: string;
      };

      const ipAddress = (sessionMeta.ipAddress ?? "unknown");
      if (ipAddress.length > VERIFICATION_LIMITS.ipAddressMaxLength) {
        ipAddress.slice(0, VERIFICATION_LIMITS.ipAddressMaxLength);
      }

      const userAgent = (sessionMeta.userAgent ?? "unknown");
      if (userAgent.length > VERIFICATION_LIMITS.userAgentMaxLength) {
        userAgent.slice(0, VERIFICATION_LIMITS.userAgentMaxLength);
      }

      const hardwareInfo = String(getDeviceInfo({ asJson: true }));
      if (hardwareInfo.length > VERIFICATION_LIMITS.hardwareInfoMaxLength) {
        hardwareInfo.slice(0, VERIFICATION_LIMITS.hardwareInfoMaxLength);
      }

      const [idImageFront, idImageBack, selfieImage] = await Promise.all([
        fileToVerificationImagePayload(frontFile, "id_front"),
        fileToVerificationImagePayload(backFile,  "id_back"),
        fileToVerificationImagePayload(selfieFile,  "selfie"),
      ]);

      await submitVerification({
        idType:      idType.trim(),
        idNumber:    idNumber.trim(),
        idFirstName: firstName.trim(),
        idLastName:  lastName.trim(),
        idBirthdate: dob,
        mobileNumber: "0" + digits,
        ipAddress,
        userAgent,
        hardwareInfo,
        idImageFront,
        idImageBack,
        selfieImage,
      });

      setSubmitted(true);
      if (user) saveUserData({ ...user, status: "PENDING" });
      showToastMsg("Application submitted! Under review.");
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to submit seller verification.";
      toast.error(message, { position: "top-center" });
    } finally {
      setSubmitting(false);
    }
  }

  function prev() {
    if (step > 1) {
      setStep2Err("");
      if (step === 3) {
        setShowOtp(false);
        setOtpValue("");
        setOtpVerified(false); // ← reset verified flag when going back
      }
      setStep(s => (s - 1) as VerifyStep);
    }
  }

  // ── Terminal states ────────────────────────────────────────────────────────
  if (verificationState === "verified") {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-[#0f1117] py-8 px-4 sm:px-6 flex items-center justify-center">
        <Card className="w-full max-w-md dark:bg-[#1c1f2e] dark:border-[#2a2d3e]">
          <CardContent className="p-8 text-center">
            <Crown className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">
              You are already a verified seller
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              You can post listings anytime.
            </p>
            <Button asChild className="mt-6 w-full rounded-full bg-stone-900 hover:bg-stone-800 text-white font-bold">
              <Link href="/create">Post a Listing</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationState === "pending" || submitted) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-[#0f1117] py-8 px-4 sm:px-6 flex items-center justify-center">
        <Card className="w-full max-w-md dark:bg-[#1c1f2e] dark:border-[#2a2d3e]">
          <CardContent className="p-8 text-center">
            <Hourglass className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">
              Application In Review
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Your seller application is being reviewed. We&apos;ll notify you in 1–2 business days.
            </p>
            <Button asChild variant="outline" className="mt-6 w-full rounded-full dark:border-[#2a2d3e] dark:text-stone-300 dark:hover:bg-[#252837]">
              <Link href="/profile">Go to Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Multi-step form ────────────────────────────────────────────────────────
  return (
    <div className="bg-stone-100 dark:bg-[#0f1117] py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <Card className="overflow-hidden dark:bg-[#1c1f2e] dark:border-[#2a2d3e] shadow-sm py-0">

          {/* Progress header */}
          <div className="bg-[#1e2433] px-7 py-5">
            <h1 className="text-white font-bold text-xl">Become a Seller</h1>
            <p className="text-slate-400 text-sm mt-1">
              Complete {TOTAL} quick steps to get verified
            </p>
            <div className="flex gap-1.5 mt-4">
              {Array.from({ length: TOTAL }, (_, i) => i + 1).map(i => (
                <div
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-300",
                    i < step   ? "bg-teal-400"  :
                    i === step ? "bg-amber-400" :
                                 "bg-white/20",
                  )}
                />
              ))}
            </div>
          </div>

          <CardContent>

            {/* ══ STEP 1 — Requirements + device check (unchanged) ══ */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base mb-1">
                    What you&apos;ll need
                  </h3>
                  <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                    To become a verified seller, we need a few things to confirm your identity.
                  </p>
                </div>

                <div className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border",
                  isMobile
                    ? "border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/20"
                    : "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20",
                )}>
                  {isMobile
                    ? <Smartphone className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                    : <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  }
                  <div>
                    <p className={cn(
                      "text-sm font-semibold",
                      isMobile ? "text-teal-700 dark:text-teal-300" : "text-amber-700 dark:text-amber-300",
                    )}>
                      {isMobile ? "Smartphone detected" : "Smartphone with camera required"}
                    </p>
                    <p className={cn(
                      "text-xs mt-0.5 leading-relaxed",
                      isMobile ? "text-teal-600 dark:text-teal-400" : "text-amber-600 dark:text-amber-400",
                    )}>
                      {isMobile
                        ? "Your device is compatible. You can proceed with verification."
                        : "This process requires a smartphone with a working camera to capture your government ID and selfie. Please open this page on your mobile device to continue."
                      }
                    </p>
                  </div>
                </div>

                <div className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border",
                  hasProfileSetupRequirement
                    ? "border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/20"
                    : "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20",
                )}>
                  {hasProfileSetupRequirement ? (
                    <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={cn(
                      "text-sm font-semibold",
                      hasProfileSetupRequirement ? "text-teal-700 dark:text-teal-300" : "text-amber-700 dark:text-amber-300",
                    )}>
                      Profile phone and address required
                    </p>
                    <p className={cn(
                      "text-xs mt-0.5 leading-relaxed",
                      hasProfileSetupRequirement ? "text-teal-600 dark:text-teal-400" : "text-amber-600 dark:text-amber-400",
                    )}>
                      {hasProfileSetupRequirement
                        ? "Your profile already has a mobile number and full location details."
                        : "Add your mobile number and complete location in your profile to proceed."
                      }
                    </p>
                    {!hasProfileSetupRequirement && (
                      <Link
                        href="/profile"
                        className="inline-flex mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:no-underline"
                      >
                        Update profile now
                      </Link>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { Icon: IdCard,  iconCls: "text-stone-500 dark:text-stone-400", title: "Government-Issued ID",   desc: "National ID, Passport, Driver's License, PRC, Postal ID, and other government-issued IDs" },
                    { Icon: Camera,  iconCls: "text-stone-500 dark:text-stone-400", title: "Selfie with your ID",    desc: "A live photo of you holding your ID, captured using your smartphone camera" },
                    { Icon: Phone,   iconCls: "text-stone-500 dark:text-stone-400", title: "Verified Phone Number",  desc: "A valid PH mobile number for OTP verification and buyer contact" },
                  ].map(({ Icon, iconCls, title, desc }) => (
                    <div key={title} className="flex items-start gap-3 p-4 border border-stone-200 dark:border-[#2a2d3e] rounded-xl bg-stone-50 dark:bg-[#13151f]">
                      <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", iconCls)} />
                      <div>
                        <p className="font-semibold text-sm text-stone-800 dark:text-stone-200">{title}</p>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <label className={cn(
                  "flex items-start gap-2.5",
                  isMobile ? "cursor-pointer" : "cursor-not-allowed opacity-40 select-none",
                )}>
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => isMobile && setAgreed(e.target.checked)}
                    disabled={!isMobile}
                    className="mt-0.5 accent-teal-600"
                  />
                  <span className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                    I agree to the{" "}
                    <Link href="/terms-seller" className="underline hover:no-underline">Seller Terms of Service</Link>
                    {" "}and confirm I am at least 18 years old and a resident of the Philippines.
                  </span>
                </label>
              </div>
            )}

            {/* ══ STEP 2 — ID details + camera captures (unchanged) ══ */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base mb-1 flex items-center gap-2">
                    <IdCard className="w-5 h-5 text-stone-500 dark:text-stone-400" />
                    Identity Verification
                  </h3>
                  <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                    Provide your ID details and capture photos using your camera.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="idType" className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                    ID Type <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <CreditCard className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <select
                      id="idType"
                      value={idType}
                      onChange={e => setIdType(e.target.value as IdType)}
                      className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm border bg-stone-50 dark:bg-[#13151f] border-stone-200 dark:border-[#2a2d3e] text-stone-800 dark:text-stone-100 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors appearance-none cursor-pointer"
                    >
                      {ID_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value} disabled={opt.value === ""}>{opt.label}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="w-3.5 h-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">First Name <span className="text-red-500">*</span></Label>
                    <Input id="firstName" name="given-name" autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" minLength={AUTH_LIMITS.nameMinLength} maxLength={AUTH_LIMITS.nameMaxLength} className="dark:bg-[#13151f] dark:border-[#2a2d3e]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Last Name <span className="text-red-500">*</span></Label>
                    <Input id="lastName" name="family-name" autoComplete="family-name" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" minLength={AUTH_LIMITS.nameMinLength} maxLength={AUTH_LIMITS.nameMaxLength} className="dark:bg-[#13151f] dark:border-[#2a2d3e]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="dob" className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Date of Birth <span className="text-red-500">*</span></Label>
                    <Input id="dob" type="date" value={dob} onChange={e => setDob(e.target.value)} max={new Date().toISOString().split("T")[0]} className="dark:bg-[#13151f] dark:border-[#2a2d3e]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="idNumber" className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">ID Number <span className="text-red-500">*</span></Label>
                    <Input id="idNumber" value={idNumber} onChange={e => setIdNumber(e.target.value.slice(0, VERIFICATION_LIMITS.idNumberMaxLength))} placeholder="1234-5678-9012" minLength={VERIFICATION_LIMITS.idNumberMinLength} maxLength={VERIFICATION_LIMITS.idNumberMaxLength} className="dark:bg-[#13151f] dark:border-[#2a2d3e] font-mono" />
                  </div>
                </div>

                <Separator className="dark:bg-[#2a2d3e]" />
                <p className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                  Photo Captures <span className="text-red-500">*</span>
                </p>

                <CameraInput label="ID Front"                        capture="environment" file={idFront} inputRef={frontRef}  onChange={setIdFront} />
                <CameraInput label="ID Back"                         capture="environment" file={idBack}  inputRef={backRef}   onChange={setIdBack}  />
                <CameraInput label="Selfie while holding your ID"    capture="user"        file={selfie}  inputRef={selfieRef} onChange={setSelfie}  />

                <p className="text-[10px] text-stone-400 dark:text-stone-500 leading-relaxed">
                  All photos are captured directly from your smartphone camera and stored securely.
                  Ensure images are clear, well-lit, and unedited.
                </p>

                {step2Err && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {step2Err}
                  </div>
                )}
              </div>
            )}

            {/* ══ STEP 3a — Phone number entry ══ */}
            {step === 3 && !showOtp && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base mb-1 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-stone-500 dark:text-stone-400" />
                    Verify your phone
                  </h3>
                  <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                    Enter your Philippine mobile number to receive a one-time passcode.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                    Mobile Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <div className="flex items-center justify-center bg-stone-100 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-lg px-3 text-sm text-stone-500 dark:text-stone-400 font-medium w-12 shrink-0 select-none">
                      +63
                    </div>
                    <NumberInput
                      value={phoneNumber}
                      onChange={setPhoneNumber}
                      placeholder="9XX XXX XXXX"
                      maxLength={PHONE_DIGITS}
                    />
                    {/* ── CHANGED: button now shows loading state and calls real API ── */}
                    <Button
                      className="rounded-full bg-stone-900 hover:bg-stone-800 text-white font-bold gap-2 disabled:opacity-50"
                      onClick={() => void handleSendOtp()}
                      disabled={!phoneComplete || sendingOtp}
                    >
                      {sendingOtp ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {sendingOtp ? "Sending…" : "Send OTP Code"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ══ STEP 3b — OTP entry ══ */}
            {step === 3 && showOtp && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base mb-1 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-stone-500 dark:text-stone-400" />
                    Enter OTP
                  </h3>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    We sent a 6-digit code to{" "}
                    <span className="font-semibold text-stone-700 dark:text-stone-300">
                      +63 {phoneNumber}
                    </span>
                  </p>
                </div>

                {/* ── CHANGED: OTP slots reflect verification state ── */}
                <div className="flex justify-center">
                  <div className="relative">
                    <InputOTP
                      maxLength={OTP_LENGTH}
                      value={otpValue}
                      onChange={setOtpValue}
                      // Disable while verifying or already verified
                      disabled={verifyingOtp || otpVerified}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>

                    {/* Overlay shown while the verify API call is in-flight */}
                    {verifyingOtp && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-[#1c1f2e]/60 rounded-lg">
                        <RefreshCw className="w-5 h-5 animate-spin text-stone-500 dark:text-stone-400" />
                      </div>
                    )}
                  </div>
                </div>

                {/* ── CHANGED: show verified badge once the backend confirms ── */}
                {otpVerified ? (
                  <div className="flex items-center justify-center gap-2 text-teal-600 dark:text-teal-400 text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Phone number verified
                  </div>
                ) : (
                  <div className="text-center text-sm mt-2">
                    <span className="text-muted-foreground">Didn&apos;t receive the code?{" "}</span>
                    {/* ── CHANGED: Resend also calls the real API ── */}
                    <button
                      type="button"
                      onClick={() => void handleResend()}
                      disabled={!canResend || sendingOtp}
                      className="underline disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {sendingOtp
                        ? "Sending…"
                        : resendSeconds > 0
                          ? `Resend in ${formatCountdown(resendSeconds)}s`
                          : "Resend"
                      }
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => { setShowOtp(false); setOtpValue(""); setOtpVerified(false); }}
                  disabled={!canResend || sendingOtp}
                  className="w-full text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Change phone number
                </button>
              </div>
            )}

            {/* Footer navigation */}
            <Separator className="mt-6 dark:bg-[#2a2d3e]" />
            <div className="flex items-center justify-between my-4">
              <span className="text-xs text-stone-400 dark:text-stone-500">
                Step {step} of {TOTAL}
              </span>
              <div className="flex gap-2">
                {step > 1 && (
                  <Button
                    variant="outline"
                    onClick={prev}
                    className="rounded-full text-sm dark:border-[#2a2d3e] dark:text-stone-300 dark:hover:bg-[#252837] disabled:opacity-50"
                    disabled={!canResend || sendingOtp}
                  >
                    Back
                  </Button>
                )}
                <Button
                  className="rounded-full bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold disabled:opacity-50"
                  onClick={() => void next()}
                  disabled={isNextDisabled}
                  title={!isMobile ? "Please open this page on a smartphone with a camera to continue" : undefined}
                >
                  {step === TOTAL ? (submitting ? "Submitting…" : "Submit Application") : "Continue"}
                </Button>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
