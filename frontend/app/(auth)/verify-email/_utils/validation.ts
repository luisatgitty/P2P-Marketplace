import { AUTH_LIMITS } from '@/utils/validation';

export function validateOtpCode(otpCode: string): string | null {
  if (!otpCode) return 'OTP is required';
  if (!/^\d+$/.test(otpCode)) return 'OTP must contain numbers only';
  if (otpCode.length !== AUTH_LIMITS.otpLength) {
    return `OTP must be ${AUTH_LIMITS.otpLength} digits`;
  }
  return null;
}
