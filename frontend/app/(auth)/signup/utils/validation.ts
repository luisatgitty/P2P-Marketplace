import type { SignupForm } from '@/types/forms';
import { isValidEmail, isValidName, isValidPassword } from '@/utils/validation';

export function validateSignupForm(form: SignupForm) {
  if (!form) return 'Form data is required';

  const firstNameError = isValidName(form.firstName, 'First name');
  if (firstNameError) return firstNameError;

  const lastNameError = isValidName(form.lastName, 'Last name');
  if (lastNameError) return lastNameError;

  const emailError = isValidEmail(form.email);
  if (emailError) return emailError;

  const passwordError = isValidPassword(form.password, form.confirmPassword);
  if (passwordError) return passwordError;
}