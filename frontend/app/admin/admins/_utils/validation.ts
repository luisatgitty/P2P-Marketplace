import {
  AUTH_LIMITS,
  isValidEmail,
  isValidName,
  isValidPassword,
} from '@/utils/validation';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;

export function validateCreateAdminInput(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  password: string;
  confirmPassword: string;
}): string | null {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim();
  const phone = (input.phone ?? '').trim();
  const role = input.role.trim();

  const firstNameError = isValidName(firstName, 'First name');
  if (firstNameError) return firstNameError;

  const lastNameError = isValidName(lastName, 'Last name');
  if (lastNameError) return lastNameError;

  const emailError = isValidEmail(email);
  if (emailError) return emailError;

  if (phone) {
    if (phone.length !== AUTH_LIMITS.phoneLength) {
      return `Phone number must be exactly ${AUTH_LIMITS.phoneLength} digits`;
    }
    if (!phone.startsWith('09')) {
      return 'Phone number must start with 09';
    }
    if (!/^\d+$/.test(phone)) {
      return 'Phone number must contain numbers only';
    }
  }

  if (!(ADMIN_ROLES as readonly string[]).includes(role)) {
    return 'Invalid role selected';
  }

  return isValidPassword(input.password, input.confirmPassword);
}
