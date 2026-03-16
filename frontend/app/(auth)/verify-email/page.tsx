"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { sendPostRequest, getSessionMeta } from "@/services/authService";
import { useUser } from "@/utils/UserContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Banner, Container } from "@/components/auth/auth-container";
import { SignupForm } from "@/types/forms";

function VerifyEmailForm() {
  const router = useRouter();
  const { saveUserData } = useUser();
  const [form, setForm] = useState<SignupForm>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [otpTimeLeft, setOtpTimeLeft] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const signupData = sessionStorage.getItem("pending_signup");
    if (!signupData) {
      router.replace("/signup"); // Redirect if no pending signup data
      return;
    }
    // Set form data from session storage
    setForm(JSON.parse(signupData));

    // Read existing OTP expiry time or set a new one
    const otpExpiration = sessionStorage.getItem("otp_expires_at");
    if (otpExpiration) {
      const remaining = Math.max(
        0,
        Math.floor((parseInt(otpExpiration) - Date.now()) / 1000),
      );
      setOtpTimeLeft(remaining);
    } else {
      const expiresAt = Date.now() + 10 * 60 * 1000;
      sessionStorage.setItem("otp_expires_at", expiresAt.toString());
      setOtpTimeLeft(10 * 60);
    }

    inputRefs.current[0]?.focus(); // Focus on first OTP input on mount
  }, []);

  // OTP expiry countdown
  useEffect(() => {
    if (otpTimeLeft <= 0) return;
    const timer = setTimeout(() => setOtpTimeLeft(otpTimeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpTimeLeft]);

  // Resend cooldown countdown
  useEffect(() => {
    if (otpResendCooldown <= 0) return;
    const timer = setTimeout(
      () => setOtpResendCooldown(otpResendCooldown - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [otpResendCooldown]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Handle individual OTP digit input
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Numbers only

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only last digit
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Go to previous input on backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Fill OTP from clipboard paste
  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate OTP length
    const otpString = otp.join("");
    if (otpString.length < 6) {
      setError("Please enter the complete 6-digit OTP");
      setLoading(false);
      return;
    }

    // Get client metadata and attempt to create the account
    try {
      const { ipAddress, userAgent } = await getSessionMeta();
      const data = await sendPostRequest(
        "/auth/verify-email",
        { ...form, ipAddress, userAgent, otpString },
        true,
      );
      saveUserData(data.user);
      sessionStorage.removeItem("pending_signup");
      sessionStorage.removeItem("otp_expires_at");
      router.replace("/");
    } catch (err: any) {
      setError(err);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (otpResendCooldown > 0) return;
    try {
      await sendPostRequest("/auth/resend-otp", { ...form });
      // Reset OTP expiry timer
      const expiresAt = Date.now() + 10 * 60 * 1000;
      sessionStorage.setItem("otp_expires_at", expiresAt.toString());
      setOtpTimeLeft(10 * 60);
      setOtpResendCooldown(60); // 60 second cooldown
      setError("");
    } catch (err: any) {
      setError(err);
    }
  };

  return (
    <Container>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="p-6 md:p-8">
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center mb-4">
                <h1 className="text-2xl font-bold">Verify your email</h1>
                <p className="text-muted-foreground text-sm">
                  We sent a 6-digit code to
                </p>
                <p className="font-medium text-sm">{form.email}</p>
              </div>

              <form onSubmit={handleSubmit}>
                <Field>
                  <FieldLabel className="text-center w-full block">
                    Enter OTP
                  </FieldLabel>

                  {/* 6 individual OTP input boxes */}
                  <div
                    className="flex gap-2 justify-center my-4"
                    onPaste={handlePaste}
                  >
                    {otp.map((digit, index) => (
                      <Input
                        key={index}
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="w-10 h-12 text-center text-lg font-bold"
                      />
                    ))}
                  </div>

                  <FieldDescription className="text-center">
                    {otpTimeLeft > 0 ? (
                      `Code expires in ${formatTime(otpTimeLeft)}`
                    ) : (
                      <span style={{ color: "red" }}>Code has expired</span>
                    )}
                  </FieldDescription>
                </Field>

                {error && (
                  <p className="text-red-500 text-sm text-center mt-2">
                    {error}
                  </p>
                )}

                <Field className="mt-4 w-xs mx-auto">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Verifying..." : "Verify Email"}
                  </Button>
                </Field>
              </form>

              {/* Resend OTP with cooldown */}
              <div className="text-center text-sm mt-2">
                <span className="text-muted-foreground">
                  Didn't receive the code?{" "}
                </span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={otpResendCooldown > 0}
                  className="font-medium underline disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {otpResendCooldown > 0
                    ? `Resend in ${otpResendCooldown}s`
                    : "Resend"}
                </button>
              </div>
            </FieldGroup>
          </div>
          <Banner />
        </CardContent>
      </Card>
    </Container>
  );
}

// Suspense required for useSearchParams()
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
