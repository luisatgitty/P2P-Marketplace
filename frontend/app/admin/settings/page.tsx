"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@/utils/UserContext";
import Image from "next/image";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  User,
  Camera,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button }               from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle }    from "@/components/ui/card";
import { FieldLabel }           from "@/components/ui/field";
import { Input }                from "@/components/ui/input";
import { Separator }            from "@/components/ui/separator";
import { updateProfileData, updateProfileImages } from "@/services/profileService";
import { toast } from "sonner";

// ── Mock current admin ─────────────────────────────────────────────────────────
const CURRENT_ADMIN = {
  firstName: "Super",
  lastName:  "Admin",
  email:     "superadmin@p2pmarket.ph",
  phone:     "09171234000",
  role:      "SUPER_ADMIN",
};

// ── Password strength ──────────────────────────────────────────────────────────
const STRENGTH_CONFIG = [
  { label: "Weak",   bar: "bg-red-500",    text: "text-red-500"    },
  { label: "Fair",   bar: "bg-amber-500",  text: "text-amber-500"  },
  { label: "Good",   bar: "bg-yellow-400", text: "text-yellow-500" },
  { label: "Strong", bar: "bg-teal-500",   text: "text-teal-500"   },
] as const;

function getStrengthScore(pw: string): number {
  return [
    pw.length >= 8,
    /[A-Z]/.test(pw),
    /[0-9]/.test(pw),
    /[!@#$%^&*()_+\-=[\]{}|;',.<>?]/.test(pw),
  ].filter(Boolean).length;
}

const LETTERS_SPACE_ONLY = /^[A-Za-z\s]+$/;

type EncodedImagePayload = {
  name: string;
  mimeType: string;
  data: string;
};

async function compressImageForProfile(file: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Invalid image file."));
      img.src = objectUrl;
    });

    const maxDimension = 1200;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((output) => resolve(output), "image/webp", 0.8);
    });

    return blob ?? file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function encodeFileToPayload(file: File): Promise<EncodedImagePayload> {
  const compressed = await compressImageForProfile(file);

  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to encode image."));
        return;
      }
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Failed to encode image."));
    reader.readAsDataURL(compressed);
  });

  const baseName = file.name.replace(/\.[^/.]+$/, "");

  return {
    name: `${baseName}.webp`,
    mimeType: "image/webp",
    data,
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

/** Eye-toggle button for password inputs */
function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <Button
      variant='icon'
      onClick={onToggle}
      className='text-muted-foreground absolute inset-y-0 right-0 rounded-l-none'
    >
      {show ? <EyeOff /> : <Eye />}
    </Button>
  );
}

/** Inline success / error feedback banner */
function InlineFeedback({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium",
        type === "success"
          ? "bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300"
          : "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400",
      )}
    >
      {type === "success"
        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
        : <AlertTriangle className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  );
}

/** Four-segment password strength bar with label */
function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;

  const score  = getStrengthScore(password);          // 0–4
  const cfg    = STRENGTH_CONFIG[Math.max(0, score - 1)]; // clamp so index never goes below 0
  const filled = Math.max(1, score);                  // always show at least 1 segment

  return (
    <div className="space-y-2">
      {/* Segmented bar */}
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 h-1.5 rounded-full transition-all duration-300",
              i < filled ? cfg.bar : "bg-stone-200 dark:bg-stone-700",
            )}
          />
        ))}
      </div>

      {/* Strength label */}
      <p className={cn("text-[11px] font-bold", cfg.text)}>
        {cfg.label} password
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, saveUserData } = useUser();
  const fileInputRef    = useRef<HTMLInputElement | null>(null);
  const originalFirstName = user?.firstName ?? CURRENT_ADMIN.firstName;
  const originalLastName  = user?.lastName ?? CURRENT_ADMIN.lastName;

  // ── Profile state
  const [firstName,       setFirstName]       = useState(CURRENT_ADMIN.firstName);
  const [lastName,        setLastName]        = useState(CURRENT_ADMIN.lastName);
  const [profilePreview,  setProfilePreview]  = useState<string | null>(null);
  const [firstNameError,  setFirstNameError]  = useState(false);
  const [lastNameError,   setLastNameError]   = useState(false);

  // ── Password state
  const [currentPw,           setCurrentPw]           = useState("");
  const [newPw,               setNewPw]               = useState("");
  const [confirmPw,           setConfirmPw]           = useState("");
  const [showCurr,            setShowCurr]            = useState(false);
  const [showNew,             setShowNew]             = useState(false);
  const [showConf,            setShowConf]            = useState(false);
  const [passwordInputsError, setPasswordInputsError] = useState(false);

  // ── Contact state
  const [newEmail, setNewEmail] = useState("");
  const [emailPw,  setEmailPw]  = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [phonePw,  setPhonePw]  = useState("");

  // ── Form state
  const [formMsg,    setFormMsg]    = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [savingForm, setSavingForm] = useState(false);
  const [showProfileImageMenu, setShowProfileImageMenu] = useState(false);
  const [updatingProfileImage, setUpdatingProfileImage] = useState(false);

  useEffect(() => {
    setFirstName(originalFirstName);
    setLastName(originalLastName);
  }, [originalFirstName, originalLastName]);

  const isNameChanged =
    firstName.trim() !== originalFirstName.trim() ||
    lastName.trim() !== originalLastName.trim();
  const hasPasswordValues = Boolean(currentPw || newPw || confirmPw);
  const canSaveChanges = isNameChanged || hasPasswordValues;

  // ── Profile image handlers ─────────────────────────────────────────────────
  function handlePickImage() {
    setShowProfileImageMenu(false);
    fileInputRef.current?.click();
  }

  async function handleImageChange(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.", { position: "top-center" });
      return;
    }

    setUpdatingProfileImage(true);
    try {
      const profileImage = await encodeFileToPayload(file);
      const updatedUser = await updateProfileImages({ profileImage });
      if (user) {
        saveUserData({ ...user, ...updatedUser });
      }
      setProfilePreview(updatedUser.profileImageUrl ?? null);
      toast.success("Profile picture updated", { position: "top-center" });
    } catch (err) {
      const message = typeof err === "string" ? err : (err instanceof Error ? err.message : "Failed to update profile picture");
      toast.error(message, { position: "top-center" });
    } finally {
      setUpdatingProfileImage(false);
    }
  }

  async function handleRemoveProfileImage() {
    setShowProfileImageMenu(false);
    setUpdatingProfileImage(true);
    try {
      const updatedUser = await updateProfileImages({ removeProfileImage: true });
      if (user) {
        saveUserData({ ...user, ...updatedUser });
      }
      setProfilePreview(null);
      toast.success("Profile picture removed", { position: "top-center" });
    } catch (err) {
      const message = typeof err === "string" ? err : (err instanceof Error ? err.message : "Failed to remove profile picture");
      toast.error(message, { position: "top-center" });
    } finally {
      setUpdatingProfileImage(false);
    }
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  function validateForm(): string | null {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    const hasFirstNameError = !trimmedFirstName || !LETTERS_SPACE_ONLY.test(trimmedFirstName);
    const hasLastNameError = !trimmedLastName || !LETTERS_SPACE_ONLY.test(trimmedLastName);

    setFirstNameError(hasFirstNameError);
    setLastNameError(hasLastNameError);

    if (!trimmedFirstName || !trimmedLastName) {
      return "First and last name are required.";
    }

    if (!LETTERS_SPACE_ONLY.test(trimmedFirstName) || !LETTERS_SPACE_ONLY.test(trimmedLastName)) {
      return "First and last name must contain letters only.";
    }

    const hasAnyPassword = Boolean(currentPw || newPw || confirmPw);
    if (hasAnyPassword) {
      if (!currentPw || !newPw || !confirmPw) {
        setPasswordInputsError(true);
        return "Current, new, and confirm password are all required.";
      }
      if (newPw.length < 8) { setPasswordInputsError(true); return "New password must be at least 8 characters."; }
      if (!/[A-Z]/.test(newPw)) { setPasswordInputsError(true); return "New password must contain at least one uppercase letter."; }
      if (!/[a-z]/.test(newPw)) { setPasswordInputsError(true); return "New password must contain at least one lowercase letter."; }
      if (!/[0-9]/.test(newPw)) { setPasswordInputsError(true); return "New password must contain at least one number."; }
      if (!/[!@#$%^&*()_+\-=[\]{}|;',.<>?]/.test(newPw)) { setPasswordInputsError(true); return "New password must contain at least one special character."; }
      if (newPw !== confirmPw) { setPasswordInputsError(true); return "Confirm password must match the new password."; }
      setPasswordInputsError(false);
    } else {
      setPasswordInputsError(false);
    }

    if (newEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return "Invalid new email format.";
      if (!emailPw) return "Password confirmation is required for email update.";
    }

    if (newPhone) {
      if (!/^9\d{9}$/.test(newPhone.replace(/\s/g, ""))) return "Enter a valid PH mobile number (e.g. 9171234567).";
      if (!phonePw) return "Password confirmation is required for mobile number update.";
    }

    return null;
  }

  // ── Save handler ────────────────────────────────────────────────────────────
  async function handleSave() {
    const err = validateForm();
    if (err) { setFormMsg({ text: err, type: "error" }); return; }

    setFormMsg(null);
    setSavingForm(true);
    try {
      const updatedUser = await updateProfileData({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: (user?.phoneNumber ?? "").trim(),
        bio: (user?.bio ?? "").trim(),
        locationProv: (user?.locationProv ?? "").trim(),
        locationCity: (user?.locationCity ?? "").trim(),
        locationBrgy: (user?.locationBrgy ?? "").trim(),
        currentPassword: currentPw.trim(),
        newPassword: newPw.trim(),
      });

      saveUserData({
        userId: user?.userId,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        bio: updatedUser.bio,
        locationBrgy: updatedUser.locationBrgy,
        locationCity: updatedUser.locationCity,
        locationProv: updatedUser.locationProv,
        profileImageUrl: updatedUser.profileImageUrl,
        coverImageUrl: updatedUser.coverImageUrl,
        role: updatedUser.role,
        status: updatedUser.status,
      });

      setSavingForm(false);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setEmailPw(""); setPhonePw("");
      setNewEmail(""); setNewPhone("");
      setPasswordInputsError(false);
      setFirstNameError(false);
      setLastNameError(false);
      setFormMsg({ text: "Settings updated successfully.", type: "success" });
      setTimeout(() => setFormMsg(null), 4000);
    } catch (err) {
      setSavingForm(false);
      setFormMsg({
        text: typeof err === "string" ? err : (err instanceof Error ? err.message : "Failed to update settings."),
        type: "error",
      });
    }
  }

  return (
    <div className="p-5 sm:p-6 space-y-5 max-w-2xl">

      {/* ── Page title ── */}
      <div>
        <h1 className="text-xl font-extrabold text-stone-900 dark:text-stone-50">
          Settings
        </h1>
      </div>

      {/* ── Profile summary banner ── */}
      <Card>
        <CardContent className="flex items-center gap-4">
          <div className="relative">
            <div
              className="relative group shrink-0 cursor-pointer"
              onClick={() => !updatingProfileImage && setShowProfileImageMenu((v) => !v)}
            >
              <Image
                src={profilePreview || user?.profileImageUrl || "/profile-icon.png"}
                alt="Profile"
                width={56}
                height={56}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-white/10"
              />
              <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <Camera className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {showProfileImageMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowProfileImageMenu(false)} />
                <div className="absolute top-full left-0 mt-2 z-20 bg-white dark:bg-[#1c1f2e] border border-stone-200 dark:border-[#2a2d3e] rounded-xl shadow-lg overflow-hidden w-44">
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[#252837] transition-colors disabled:opacity-60"
                    onClick={handlePickImage}
                    disabled={updatingProfileImage}
                  >
                    <Camera className="w-4 h-4 text-stone-400" />
                    {updatingProfileImage ? "Updating..." : "Update Photo"}
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-stone-100 dark:border-[#2a2d3e] disabled:opacity-60"
                    onClick={handleRemoveProfileImage}
                    disabled={updatingProfileImage}
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove Photo
                  </button>
                </div>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleImageChange(e.target.files?.[0] ?? null);
                e.currentTarget.value = "";
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-extrabold text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-slate-400 truncate">{user?.email}</p>
            <span className="inline-block mt-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {user?.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ══ Account Settings card ═══════════════════════════════════════════ */}
      <Card className="dark:bg-[#1c1f2e] dark:border-[#2a2d3e]">
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Update your admin account credentials</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Wraps name inputs in form to disable browser autocomplete */}
          <form className="contents" autoComplete="off">
            {/* ── Name ── */}
            <div className="space-y-2">
              <FieldLabel htmlFor="firstName">First Name</FieldLabel>
              <Input
                id="firstName"
                value={firstName}
                aria-invalid={firstNameError}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (firstNameError) setFirstNameError(false);
                }}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
              <Input
                id="lastName"
                value={lastName}
                aria-invalid={lastNameError}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (lastNameError) setLastNameError(false);
                }}
              />
            </div>
          </form>

          {/* ── Contact info ── */}
          <div className="space-y-2 cursor-not-allowed">
            <FieldLabel htmlFor="currentEmail">Email Address</FieldLabel>
            <Input
              id="currentEmail"
              value={user?.email ?? ""}
              disabled
            />
          </div>
          <div className="space-y-2 cursor-not-allowed">
            <FieldLabel htmlFor="currentPhone">Contact Number</FieldLabel>
            <Input
              id="currentPhone"
              value={user?.phoneNumber ?? ""}
              disabled
            />
          </div>
        </CardContent>

        <Separator />

        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Leave all three fields empty if you don&apos;t want to change your password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Current password */}
          <div className="space-y-2">
            <FieldLabel htmlFor="currentPw">Current Password</FieldLabel>
            <div className="relative">
              <Input
                id="currentPw"
                type={showCurr ? "text" : "password"}
                value={currentPw}
                onChange={(e) => {
                  setCurrentPw(e.target.value);
                  if (!e.target.value) {
                    setNewPw("");
                    setConfirmPw("");
                    setPasswordInputsError(false);
                  }
                  if (passwordInputsError) setPasswordInputsError(false);
                }}
                placeholder="Enter current password"
                aria-invalid={passwordInputsError}
                className={"pr-10 dark:bg-[#13151f] dark:border-[#2a2d3e]"}
              />
              <EyeToggle show={showCurr} onToggle={() => setShowCurr((v) => !v)} />
            </div>
          </div>

          {/* New + Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <FieldLabel htmlFor="newPw">New Password</FieldLabel>
              <div className="relative">
                <Input
                  id="newPw"
                  type={showNew ? "text" : "password"}
                  disabled={!currentPw.trim()}
                  value={newPw}
                  onChange={(e) => {
                    setNewPw(e.target.value);
                    if (passwordInputsError) setPasswordInputsError(false);
                  }}
                  placeholder="Enter new password"
                  aria-invalid={passwordInputsError}
                  className={"pr-10 dark:bg-[#13151f] dark:border-[#2a2d3e]"}
                />
                <EyeToggle show={showNew} onToggle={() => setShowNew((v) => !v)} />
              </div>
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="confirmPw">Confirm New Password</FieldLabel>
              <div className="relative">
                <Input
                  id="confirmPw"
                  type={showConf ? "text" : "password"}
                  disabled={!currentPw.trim()}
                  value={confirmPw}
                  onChange={(e) => {
                    setConfirmPw(e.target.value);
                    if (passwordInputsError) setPasswordInputsError(false);
                  }}
                  placeholder="Re-enter new password"
                  aria-invalid={passwordInputsError}
                  className={"pr-10 dark:bg-[#13151f] dark:border-[#2a2d3e]"}
                />
              </div>
            </div>
          </div>

          {/* Strength + checklist — only shown when typing a new password */}
          {newPw && (
            <div className="space-y-3 pt-1">

              {/* ── Strength progress bar ── */}
              <PasswordStrengthBar password={newPw} />

              {/* ── Complexity checklist ── */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {[
                  { label: "At least 8 characters",    ok: newPw.length >= 8 },
                  { label: "One uppercase letter",      ok: /[A-Z]/.test(newPw) },
                  { label: "One number",                ok: /[0-9]/.test(newPw) },
                  { label: "One special character",     ok: /[!@#$%^&*()_+\-=[\]{}|;',.<>?]/.test(newPw) },
                ].map(({ label, ok }) => (
                  <div key={label} className="flex items-center gap-2">
                    <CheckCircle2
                      className={cn(
                        "w-3.5 h-3.5 shrink-0 transition-colors duration-200",
                        ok ? "text-teal-500" : "text-stone-300 dark:text-stone-600",
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs transition-colors duration-200",
                        ok ? "text-stone-700 dark:text-stone-200" : "text-stone-400 dark:text-stone-500",
                      )}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardContent className="space-y-4">
          {/* ── Error Message ── */}
          {formMsg && <InlineFeedback msg={formMsg.text} type={formMsg.type} />}

          {/* ── Save Button ── */}
          <Button
            type="button"
            disabled={savingForm || !canSaveChanges}
            onClick={handleSave}
            className="rounded-full px-6 bg-[#1e2433] hover:bg-[#2a3650] dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 text-white font-bold gap-2"
          >
            <User className="w-4 h-4" />
            {savingForm ? "Saving…" : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* ── Security reminders ── */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
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
            <li key={tip} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
              <span className="text-amber-400 mt-0.5 shrink-0">•</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
