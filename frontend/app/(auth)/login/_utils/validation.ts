import { isValidEmail, isValidPassword } from "@/utils/validation";

export function validateLoginForm(form: {
  email: string;
  password: string;
}): string | null {
  const emailError = isValidEmail(form.email);
  if (emailError) return emailError;

  const passwordError = isValidPassword(form.password);
  if (passwordError) return passwordError;

  return null;
}
