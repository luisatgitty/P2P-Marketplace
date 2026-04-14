import type { SignupForm } from "@/types/forms";

export const AUTH_LIMITS = {
  nameMinLength: 2,
  nameMaxLength: 50,
  emailMinLength: 5,
  emailMaxLength: 254,
  emailLocalMaxLength: 64,
  emailDomainMaxLength: 255,
  passwordMinLength: 8,
  passwordMaxLength: 72,
  otpLength: 6,
} as const;

export function isValidEmail(email: string): string | null {
  const normalizedEmail = email.trim();
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!normalizedEmail) return "Email is required";
  if (normalizedEmail.length < AUTH_LIMITS.emailMinLength) {
    return `Email must be at least ${AUTH_LIMITS.emailMinLength} characters`;
  }
  if (normalizedEmail.length > AUTH_LIMITS.emailMaxLength) {
    return `Email must not exceed ${AUTH_LIMITS.emailMaxLength} characters`;
  }

  const parts = normalizedEmail.split("@");
  if (parts.length !== 2) return "Invalid email format";
  if (parts[0].length > AUTH_LIMITS.emailLocalMaxLength) {
    return `Email local part must not exceed ${AUTH_LIMITS.emailLocalMaxLength} characters`;
  }
  if (parts[1].length > AUTH_LIMITS.emailDomainMaxLength) {
    return `Email domain part must not exceed ${AUTH_LIMITS.emailDomainMaxLength} characters`;
  }

  if (!emailRegex.test(normalizedEmail)) return "Invalid email format";
  return null;
}

export function isValidPassword(password: string, confirmPassword?: string): string | null {
  if (!password) return "Password is required";
  if (password.length < AUTH_LIMITS.passwordMinLength) {
    return `Password must be at least ${AUTH_LIMITS.passwordMinLength} characters`;
  }
  if (password.length > AUTH_LIMITS.passwordMaxLength) {
    return `Password must not exceed ${AUTH_LIMITS.passwordMaxLength} characters`;
  }
  if (typeof confirmPassword === "string" && password !== confirmPassword) {
    return "Passwords do not match";
  }
  // NOTE: Disabled password complexity validation during development
  // if (password.length < AUTH_LIMITS.passwordMinLength) return "Password must be at least 8 characters";
  // if (password.length > AUTH_LIMITS.passwordMaxLength) return "Password must not exceed 72 characters";
  // if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  // if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
  // if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  // if (!/[!@#$%^&*()\-_=+\[\]{}|;:'",.<>?/`~]/.test(password))
  //   return "Password must contain at least one special character";
  return null;
}

export function isValidName(name: string, field: string): string | null {
  if (!name) return `${field} is required`;
  if (name.length < AUTH_LIMITS.nameMinLength) {
    return `${field} must be at least ${AUTH_LIMITS.nameMinLength} characters`;
  }
  if (name.length > AUTH_LIMITS.nameMaxLength) {
    return `${field} must not exceed ${AUTH_LIMITS.nameMaxLength} characters`;
  }
  if (!/^[a-zA-Z\s\-']+$/.test(name)) return `${field} must contain letters only`;
  return null;
}

export function validateSignupForm(form: SignupForm) {
  if (!form) return "Form data is required";

  const firstNameError = isValidName(form.firstName, "First name");
  if (firstNameError) return firstNameError;

  const lastNameError  = isValidName(form.lastName, "Last name");
  if (lastNameError) return lastNameError;

  const emailError     = isValidEmail(form.email);
  if (emailError) return emailError;

  const passwordError  = isValidPassword(form.password, form.confirmPassword);
  if (passwordError) return passwordError;
}

export function validateLoginForm(form: { email: string; password: string }): string | null {
  const emailError = isValidEmail(form.email);
  if (emailError) return emailError;

  const passwordError = isValidPassword(form.password);
  if (passwordError) return passwordError;

  return null;
}

export function validateForgotPasswordInput(email: string): string | null {
  return isValidEmail(email);
}

export function validateResetPasswordInput(password: string, confirmPassword: string): string | null {
  return isValidPassword(password, confirmPassword);
}

export function validateOtpCode(otpCode: string): string | null {
  if (!otpCode) return "OTP is required";
  if (!/^\d+$/.test(otpCode)) return "OTP must contain numbers only";
  if (otpCode.length !== AUTH_LIMITS.otpLength) {
    return `OTP must be ${AUTH_LIMITS.otpLength} digits`;
  }
  return null;
}

export function validateImageURL(url: string): string {
  if (url.startsWith("/uploads/") || url.startsWith("uploads/")) {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
    const normalized = url.startsWith("/") ? url : `/${url}`;
    return apiBase ? `${apiBase}${normalized}` : normalized;
  }

  return url;
}
