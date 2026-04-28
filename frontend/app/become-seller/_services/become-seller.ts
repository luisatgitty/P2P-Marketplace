import { SubmitVerificationPayload } from '../_types/become-seller';

export async function submitVerification(
  payload: SubmitVerificationPayload,
): Promise<void> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/profile/me/verification`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      },
    );

    const parsedJson = await res.json();
    if (!res.ok) {
      throw (
        parsedJson?.data?.message || 'Failed to submit seller verification.'
      );
    }
  } catch (error: any) {
    throw (
      error?.message || 'An unexpected error occurred. Please try again later.'
    );
  }
}

async function post<T = unknown>(route: string, payload: unknown): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // send session cookie
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!res.ok) {
    const message: string =
      json?.data?.message ??
      json?.message ??
      'An unexpected error occurred. Please try again.';
    throw new Error(message);
  }

  return json.data as T;
}

export async function sendPhoneOTP(
  phoneNumber: string,
  ipAddress: string,
  userAgent: string,
): Promise<void> {
  await post('/auth/otp/send', { phoneNumber, ipAddress, userAgent });
}

export async function verifyPhoneOTP(
  phoneNumber: string,
  otpCode: string,
): Promise<void> {
  await post('/auth/otp/verify', { phoneNumber, otpCode });
}
