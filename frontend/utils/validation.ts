import type { SignupForm } from "@/types/forms";

export function isValidEmail(email: string): string | null {
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!email) return "Email is required";
  if (email.length < 3) return "Email must be at least 3 characters";
  if (email.length > 254) return "Email must not exceed 254 characters";
  if (!emailRegex.test(email)) return "Invalid email format";
  return null;
}

export function isValidPassword(password: string, confirmPassword: string): string | null {
  if (!password) return "Password is required";
  if (password !== confirmPassword) return "Passwords do not match";
  // NOTE: Disabled password complexity validation during development
  // if (password.length < 8) return "Password must be at least 8 characters";
  // if (password.length > 72) return "Password must not exceed 72 characters";
  // if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  // if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
  // if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  // if (!/[!@#$%^&*()\-_=+\[\]{}|;:'",.<>?/`~]/.test(password))
  //   return "Password must contain at least one special character";
  return null;
}

export function isValidName(name: string, field: string): string | null {
  if (!name) return `${field} is required`;
  if (name.length < 2) return `${field} must be at least 2 characters`;
  if (name.length > 50) return `${field} must not exceed 50 characters`;
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

export function validateImageURL(url: string): string {
  if (url.startsWith("/uploads/") || url.startsWith("uploads/")) {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
    const normalized = url.startsWith("/") ? url : `/${url}`;
    return apiBase ? `${apiBase}${normalized}` : normalized;
  }

  return url;
}
