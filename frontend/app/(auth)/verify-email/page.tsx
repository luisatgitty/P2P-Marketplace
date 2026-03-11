"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { signUpUser, getSessionMeta } from "@/services/authService";
import { useUser } from "@/utils/UserContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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

    const [otp, setOtp] = useState(["", "", "", "", "", ""]); // 6 digit OTP array
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0); // countdown timer
    const [timeLeft, setTimeLeft] = useState(0); // OTP expiry countdown
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        const pending = sessionStorage.getItem("pending_verification");
        if (!pending) {
            router.replace("/signup"); // No data found, redirect back
            return;
        }
        // Set form data from session storage
        const parsed = JSON.parse(pending);
        setForm(parsed);

        // Read existing expiry or create a new one
        const stored = sessionStorage.getItem("otp_expires_at");
        if (stored) {
            const remaining = Math.max(0, Math.floor((parseInt(stored) - Date.now()) / 1000));
            setTimeLeft(remaining);
        } else {
            const expiresAt = Date.now() + 10 * 60 * 1000;
            sessionStorage.setItem("otp_expires_at", expiresAt.toString());
            setTimeLeft(10 * 60);
        }

        inputRefs.current[0]?.focus(); // focus first OTP input
    }, []);

    // OTP expiry countdown
    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        return () => clearTimeout(timer);
    }, [timeLeft]);

    // Resend cooldown countdown
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    // Handle individual OTP digit input
    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // numbers only

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1); // only last digit
        setOtp(newOtp);

        // Auto focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    // Handle backspace — go to previous input
    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    // Handle paste — fill all boxes at once
    const handlePaste = (e: React.ClipboardEvent) => {
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (pasted.length === 6) {
            setOtp(pasted.split(""));
            inputRefs.current[5]?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const otpString = otp.join("");
        if (otpString.length < 6) {
            setError("Please enter the complete 6-digit OTP");
            setLoading(false);
            return;
        }

        try {
            // Get the user's IP address and user agent
            const { ipAddress, userAgent } = await getSessionMeta();
            const user = await signUpUser("/auth/verify-email", { ...form, ipAddress, userAgent, otpString });
            saveUserData(user);
            router.replace("/");
        } catch (err: any) {
            setError(err);
            setOtp(["", "", "", "", "", ""]); // clear OTP on error
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        try {
            await signUpUser("/auth/resend-otp", { ...form });
            // Reset OTP expiry timer
            const expiresAt = Date.now() + 10 * 60 * 1000;
            sessionStorage.setItem("otp_expires_at", expiresAt.toString());
            setTimeLeft(10 * 60);
            setResendCooldown(60); // 60 second cooldown
            setError("");
        } catch (err: any) {
            setError(err);
        }
    };

    return (
        <div className="flex min-h-svh flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
            <Card>
            <CardContent className="p-6 md:p-8">
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
                    <FieldLabel className="text-center w-full block">Enter OTP</FieldLabel>

                    {/* 6 individual OTP input boxes */}
                    <div className="flex gap-2 justify-center my-4" onPaste={handlePaste}>
                        {otp.map((digit, index) => (
                        <Input
                            key={index}
                            ref={(el) => { inputRefs.current[index] = el; }}
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
                        {timeLeft > 0
                            ? `Code expires in ${formatTime(timeLeft)}`
                            : <span style={{ color: "red" }}>Code has expired</span>}
                    </FieldDescription>
                    </Field>

                    {error && (
                    <p className="text-red-500 text-sm text-center mt-2">{error}</p>
                    )}

                    <Field className="mt-4">
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Verifying..." : "Verify Email"}
                    </Button>
                    </Field>
                </form>

                {/* Resend OTP with cooldown */}
                <div className="text-center text-sm mt-2">
                    <span className="text-muted-foreground">Didn't receive the code? </span>
                    <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="font-medium underline disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
                    </button>
                </div>

                </FieldGroup>
            </CardContent>
            </Card>
        </div>
        </div>
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
