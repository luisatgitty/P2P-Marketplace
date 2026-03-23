export type VerificationImagePayload = {
  name: string;
  mimeType: string;
  data: string;
};

export type SubmitVerificationPayload = {
  idType: string;
  idNumber: string;
  idFirstName: string;
  idLastName: string;
  idBirthdate: string;
  mobileNumber: string;
  userAgent: string;
  ipAddress: string;
  hardwareInfo: string;
  idImageFront: VerificationImagePayload;
  idImageBack: VerificationImagePayload;
  selfieImage: VerificationImagePayload;
};

export async function submitVerification(payload: SubmitVerificationPayload): Promise<void> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/me/verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to submit seller verification.";
    }
  } catch (error: any) {
    throw error?.message || "An unexpected error occurred. Please try again later.";
  }
}
