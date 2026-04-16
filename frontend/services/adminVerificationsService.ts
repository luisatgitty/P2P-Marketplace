export type AdminVerificationRecord = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  profile_image_url: string;
  id_first_name: string;
  id_last_name: string;
  id_birthdate: string;
  mobile_number: string;
  id_type: string;
  id_number: string;
  id_image_front_url: string;
  id_image_back_url: string;
  selfie_url: string;
  ip_address: string;
  user_agent: string;
  hardware_info: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_at: string;
};

export type AdminVerificationStatusPayload = {
  status: "VERIFIED" | "REJECTED";
  reason: string;
};

export type AdminVerificationsQuery = {
  search?: string;
  status?: string;
  idType?: string;
  limit?: number;
  offset?: number;
};

export type AdminVerificationsResponse = {
  verifications: AdminVerificationRecord[];
  total: number;
  limit: number;
  offset: number;
};

export async function getAdminVerifications(query?: AdminVerificationsQuery): Promise<AdminVerificationsResponse> {
  try {
    const params = new URLSearchParams();
    if (query?.search) params.set("search", query.search);
    if (query?.status) params.set("status", query.status);
    if (query?.idType) params.set("idType", query.idType);
    if (typeof query?.limit === "number") params.set("limit", String(query.limit));
    if (typeof query?.offset === "number") params.set("offset", String(query.offset));

    const querySuffix = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/verifications${querySuffix}`, {
      method: "GET",
      credentials: "include",
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to fetch verification records.";
    }

    return {
      verifications: (parsedJson?.data?.verifications ?? []) as AdminVerificationRecord[],
      total: Number(parsedJson?.data?.total ?? 0),
      limit: Number(parsedJson?.data?.limit ?? query?.limit ?? 0),
      offset: Number(parsedJson?.data?.offset ?? query?.offset ?? 0),
    };
  } catch {
    throw "An unexpected error occurred. Please try again later.";
  }
}

export async function setAdminVerificationStatus(verificationId: string, payload: AdminVerificationStatusPayload): Promise<void> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/verifications/${encodeURIComponent(verificationId)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to update verification status.";
    }
  } catch (error: any) {
    throw error?.message || "An unexpected error occurred. Please try again later.";
  }
}
