"use client";

import { useState } from "react";
import {
  Lock,
  Mail,
  Phone,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Shield,
  KeyRound,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Mock current admin ─────────────────────────────────────────────────────────
const CURRENT_ADMIN = {
  firstName: "Super",
  lastName: "Admin",
  email: "superadmin@p2pmarket.ph",
  phone: "09171234000",
  role: "SUPER_ADMIN",
};

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-stone-200 dark:border-[#2a2d3e] overflow-hidden">
      <div className="px-6 py-5 border-b border-stone-100 dark:border-[#2a2d3e]">
        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-50">
          {title}
        </h3>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          {desc}
        </p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-1.5">
      {children}
    </label>
  );
}

function Input({
  type = "text",
  value,
  onChange,
  placeholder,
  disabled,
  rightEl,
}: {
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rightEl?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "w-full px-3.5 py-2.5 rounded-xl text-sm border transition-colors outline-none",
          "bg-stone-50 dark:bg-[#13151f] text-stone-800 dark:text-stone-100 placeholder-stone-400",
          "border-stone-200 dark:border-[#2a2d3e] focus:border-stone-400 dark:focus:border-stone-500",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          rightEl && "pr-10",
        )}
      />
      {rightEl && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {rightEl}
        </div>
      )}
    </div>
  );
}

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium",
        type === "success"
          ? "bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300"
          : "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400",
      )}
    >
      {type === "success" ? (
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      )}
      {msg}
    </div>
  );
}

export default function SettingsPage() {
  // Profile
  const [firstName, setFirstName] = useState(CURRENT_ADMIN.firstName);
  const [lastName, setLastName] = useState(CURRENT_ADMIN.lastName);
  const [profileMsg, setProfileMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurr, setShowCurr] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [pwMsg, setPwMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  // Email
  const [newEmail, setNewEmail] = useState("");
  const [emailPw, setEmailPw] = useState("");
  const [emailMsg, setEmailMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);

  // Phone
  const [newPhone, setNewPhone] = useState("");
  const [phonePw, setPhonePw] = useState("");
  const [phoneMsg, setPhoneMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [savingPhone, setSavingPhone] = useState(false);

  function simulate(
    setter: (v: boolean) => void,
    msgSetter: (v: { text: string; type: "success" | "error" } | null) => void,
    onSuccess: () => void,
    validation?: () => string | null,
  ) {
    const err = validation?.();
    if (err) {
      msgSetter({ text: err, type: "error" });
      return;
    }
    setter(true);
    setTimeout(() => {
      setter(false);
      onSuccess();
      msgSetter({ text: "Changes saved successfully.", type: "success" });
      setTimeout(() => msgSetter(null), 4000);
    }, 900);
  }

  const EyeBtn = ({
    show,
    setShow,
  }: {
    show: boolean;
    setShow: (v: boolean) => void;
  }) => (
    <button
      type="button"
      onClick={() => setShow(!show)}
      className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
    >
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <div className="p-5 sm:p-6 space-y-5 max-w-2xl">
      <div>
        <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-50">
          Settings
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          Manage your admin account credentials and profile
        </p>
      </div>

      {/* Account summary */}
      <div className="bg-[#1e2433] rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white text-lg font-extrabold flex-shrink-0">
          {CURRENT_ADMIN.firstName.charAt(0)}
          {CURRENT_ADMIN.lastName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-extrabold text-white">
            {CURRENT_ADMIN.firstName} {CURRENT_ADMIN.lastName}
          </p>
          <p className="text-sm text-slate-400">{CURRENT_ADMIN.email}</p>
          <span className="inline-block mt-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {CURRENT_ADMIN.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
          </span>
        </div>
        <Shield className="w-6 h-6 text-amber-400 flex-shrink-0" />
      </div>

      {/* ── Profile ── */}
      <Section
        title="Profile Information"
        desc="Update your display name shown in the admin panel."
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <FieldLabel>First Name</FieldLabel>
            <Input value={firstName} onChange={setFirstName} />
          </div>
          <div>
            <FieldLabel>Last Name</FieldLabel>
            <Input value={lastName} onChange={setLastName} />
          </div>
        </div>
        {profileMsg && (
          <div className="mb-4">
            <Toast msg={profileMsg.text} type={profileMsg.type} />
          </div>
        )}
        <button
          type="button"
          disabled={savingProfile}
          onClick={() =>
            simulate(
              setSavingProfile,
              setProfileMsg,
              () => {},
              () =>
                !firstName.trim() || !lastName.trim()
                  ? "First and last name are required."
                  : null,
            )
          }
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1e2433] dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-bold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
        >
          <User className="w-4 h-4" />
          {savingProfile ? "Saving…" : "Save Profile"}
        </button>
      </Section>

      {/* ── Password ── */}
      <Section
        title="Change Password"
        desc="Use a strong password with at least 8 characters, including uppercase, numbers, and symbols."
      >
        <div className="space-y-4 mb-4">
          <div>
            <FieldLabel>Current Password</FieldLabel>
            <Input
              type={showCurr ? "text" : "password"}
              value={currentPw}
              onChange={setCurrentPw}
              placeholder="Enter current password"
              rightEl={<EyeBtn show={showCurr} setShow={setShowCurr} />}
            />
          </div>
          <div>
            <FieldLabel>New Password</FieldLabel>
            <Input
              type={showNew ? "text" : "password"}
              value={newPw}
              onChange={setNewPw}
              placeholder="Enter new password (min 8 chars)"
              rightEl={<EyeBtn show={showNew} setShow={setShowNew} />}
            />
          </div>
          <div>
            <FieldLabel>Confirm New Password</FieldLabel>
            <Input
              type={showConf ? "text" : "password"}
              value={confirmPw}
              onChange={setConfirmPw}
              placeholder="Re-enter new password"
              rightEl={<EyeBtn show={showConf} setShow={setShowConf} />}
            />
          </div>
        </div>

        {/* Strength indicators */}
        {newPw && (
          <div className="mb-4 space-y-1.5">
            {[
              { label: "At least 8 characters", ok: newPw.length >= 8 },
              { label: "One uppercase letter", ok: /[A-Z]/.test(newPw) },
              { label: "One number", ok: /[0-9]/.test(newPw) },
              {
                label: "One special character",
                ok: /[!@#$%^&*()_+\-=[\]{}|;',.<>?]/.test(newPw),
              },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center gap-2">
                <CheckCircle2
                  className={cn(
                    "w-3.5 h-3.5 flex-shrink-0",
                    ok ? "text-teal-500" : "text-stone-300 dark:text-stone-600",
                  )}
                />
                <span
                  className={cn(
                    "text-xs",
                    ok
                      ? "text-stone-700 dark:text-stone-200"
                      : "text-stone-400 dark:text-stone-500",
                  )}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}

        {pwMsg && (
          <div className="mb-4">
            <Toast msg={pwMsg.text} type={pwMsg.type} />
          </div>
        )}
        <button
          type="button"
          disabled={savingPw}
          onClick={() =>
            simulate(
              setSavingPw,
              setPwMsg,
              () => {
                setCurrentPw("");
                setNewPw("");
                setConfirmPw("");
              },
              () => {
                if (!currentPw) return "Current password is required.";
                if (newPw.length < 8)
                  return "New password must be at least 8 characters.";
                if (newPw !== confirmPw) return "Passwords do not match.";
                return null;
              },
            )
          }
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1e2433] dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-bold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
        >
          <KeyRound className="w-4 h-4" />
          {savingPw ? "Updating…" : "Update Password"}
        </button>
      </Section>

      {/* ── Email ── */}
      <Section
        title="Change Email Address"
        desc="A verification email will be sent to your new address before the change takes effect."
      >
        <div className="space-y-4 mb-4">
          <div>
            <FieldLabel>Current Email</FieldLabel>
            <Input value={CURRENT_ADMIN.email} onChange={() => {}} disabled />
          </div>
          <div>
            <FieldLabel>New Email Address</FieldLabel>
            <Input
              type="email"
              value={newEmail}
              onChange={setNewEmail}
              placeholder="Enter new email address"
            />
          </div>
          <div>
            <FieldLabel>Current Password (to confirm)</FieldLabel>
            <Input
              type="password"
              value={emailPw}
              onChange={setEmailPw}
              placeholder="Enter your password to confirm"
            />
          </div>
        </div>
        {emailMsg && (
          <div className="mb-4">
            <Toast msg={emailMsg.text} type={emailMsg.type} />
          </div>
        )}
        <button
          type="button"
          disabled={savingEmail}
          onClick={() =>
            simulate(
              setSavingEmail,
              setEmailMsg,
              () => {
                setNewEmail("");
                setEmailPw("");
              },
              () => {
                if (!newEmail.trim()) return "New email address is required.";
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail))
                  return "Invalid email format.";
                if (!emailPw) return "Password confirmation is required.";
                return null;
              },
            )
          }
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1e2433] dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-bold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
        >
          <Mail className="w-4 h-4" />
          {savingEmail ? "Sending verification…" : "Update Email"}
        </button>
      </Section>

      {/* ── Phone ── */}
      <Section
        title="Change Mobile Number"
        desc="Update the mobile number associated with your admin account."
      >
        <div className="space-y-4 mb-4">
          <div>
            <FieldLabel>Current Number</FieldLabel>
            <Input value={CURRENT_ADMIN.phone} onChange={() => {}} disabled />
          </div>
          <div>
            <FieldLabel>New Mobile Number</FieldLabel>
            <div className="flex gap-2">
              <div className="flex items-center justify-center bg-stone-100 dark:bg-[#13151f] border border-stone-200 dark:border-[#2a2d3e] rounded-xl px-3 text-sm text-stone-500 dark:text-stone-400 font-medium w-14 flex-shrink-0">
                +63
              </div>
              <Input
                value={newPhone}
                onChange={setNewPhone}
                placeholder="9XX XXX XXXX"
              />
            </div>
          </div>
          <div>
            <FieldLabel>Current Password (to confirm)</FieldLabel>
            <Input
              type="password"
              value={phonePw}
              onChange={setPhonePw}
              placeholder="Enter your password to confirm"
            />
          </div>
        </div>
        {phoneMsg && (
          <div className="mb-4">
            <Toast msg={phoneMsg.text} type={phoneMsg.type} />
          </div>
        )}
        <button
          type="button"
          disabled={savingPhone}
          onClick={() =>
            simulate(
              setSavingPhone,
              setPhoneMsg,
              () => {
                setNewPhone("");
                setPhonePw("");
              },
              () => {
                if (!newPhone.trim()) return "New mobile number is required.";
                if (!/^9\d{9}$/.test(newPhone.replace(/\s/g, "")))
                  return "Enter a valid PH mobile number (e.g. 9171234567).";
                if (!phonePw) return "Password confirmation is required.";
                return null;
              },
            )
          }
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1e2433] dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-bold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
        >
          <Phone className="w-4 h-4" />
          {savingPhone ? "Updating…" : "Update Mobile Number"}
        </button>
      </Section>

      {/* ── Security info ── */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
            Security Reminders
          </p>
        </div>
        <ul className="space-y-1.5">
          {[
            "Never share your admin credentials with anyone, including other admins.",
            "Always use a strong, unique password. Enable a password manager.",
            "Log out of the admin panel when using a shared or public device.",
            "Report any suspicious login activity to the system owner immediately.",
          ].map((tip) => (
            <li
              key={tip}
              className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400"
            >
              <span className="text-amber-400 mt-0.5 flex-shrink-0">•</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
