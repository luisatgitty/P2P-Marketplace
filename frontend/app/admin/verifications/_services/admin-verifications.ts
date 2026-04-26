export type AdminVerificationStatusPayload = {
  status: 'VERIFIED' | 'REJECTED';
  reason: string;
};

export async function setAdminVerificationStatus(
  verificationId: string,
  payload: AdminVerificationStatusPayload,
): Promise<void> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/verifications/${encodeURIComponent(verificationId)}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      },
    );

    const parsedJson = await res.json();
    if (!res.ok) {
      throw (
        parsedJson?.data?.message || 'Failed to update verification status.'
      );
    }
  } catch (error: any) {
    throw (
      error?.message || 'An unexpected error occurred. Please try again later.'
    );
  }
}
