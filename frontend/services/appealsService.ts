import type {
  AppealCategory,
  AppealResolution,
  AppealStatus,
  AppealSummary,
  AppealTicket,
} from "@/types/appeal";

export type SubmitAppealPayload = {
  userId?: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  category: AppealCategory;
  subject: string;
  message: string;
  evidenceUrl?: string | null;
};

export type ReviewAppealPayload = {
  resolution: AppealResolution;
  adminNote: string;
};

export type AppealQuery = {
  search?: string;
  status?: AppealStatus | "ALL";
  category?: AppealCategory | "ALL";
  limit?: number;
  offset?: number;
};

export type AppealsResponse = {
  appeals: AppealTicket[];
  total: number;
  limit: number;
  offset: number;
};

function getApiUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_API_URL}${path}`;
}

async function parseApiResponse(res: Response) {
  const raw = await res.text();

  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    if (!res.ok) {
      throw new Error(raw || `Request failed with status ${res.status}`);
    }
    throw new Error("Received a non-JSON response from the server.");
  }
}

export async function submitAppeal(payload: SubmitAppealPayload): Promise<AppealTicket> {
  const res = await fetch(getApiUrl("/appeals"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const parsedJson = await parseApiResponse(res);
  if (!res.ok) {
    throw new Error(parsedJson?.data?.message || "Failed to submit appeal.");
  }

  return parsedJson?.data?.appeal as AppealTicket;
}

export async function getAppeals(query?: AppealQuery): Promise<AppealsResponse> {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query?.status) params.set("status", query.status);
  if (query?.category) params.set("category", query.category);
  if (typeof query?.limit === "number") params.set("limit", String(query.limit));
  if (typeof query?.offset === "number") params.set("offset", String(query.offset));

  const querySuffix = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(getApiUrl(`/admin/appeals${querySuffix}`), {
    method: "GET",
    credentials: "include",
  });

  const parsedJson = await parseApiResponse(res);
  if (!res.ok) {
    throw new Error(parsedJson?.data?.message || "Failed to fetch appeals.");
  }

  return {
    appeals: (parsedJson?.data?.appeals ?? []) as AppealTicket[],
    total: Number(parsedJson?.data?.total ?? 0),
    limit: Number(parsedJson?.data?.limit ?? query?.limit ?? 0),
    offset: Number(parsedJson?.data?.offset ?? query?.offset ?? 0),
  };
}

export async function getAppealsByEmail(email: string, limit = 4): Promise<AppealTicket[]> {
  const params = new URLSearchParams({ email, limit: String(limit) });
  const res = await fetch(getApiUrl(`/appeals?${params.toString()}`), {
    method: "GET",
    credentials: "include",
  });

  const parsedJson = await parseApiResponse(res);
  if (!res.ok) {
    throw new Error(parsedJson?.data?.message || "Failed to fetch appeals.");
  }

  return (parsedJson?.data?.appeals ?? []) as AppealTicket[];
}

export async function reviewAppeal(appealId: string, payload: ReviewAppealPayload): Promise<AppealTicket> {
  const res = await fetch(getApiUrl(`/admin/appeals/${encodeURIComponent(appealId)}/review`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const parsedJson = await parseApiResponse(res);
  if (!res.ok) {
    throw new Error(parsedJson?.data?.message || "Failed to review appeal.");
  }

  return parsedJson?.data?.appeal as AppealTicket;
}

export async function getAppealSummary(): Promise<AppealSummary> {
  const res = await fetch(getApiUrl("/admin/appeals/summary"), {
    method: "GET",
    credentials: "include",
  });

  const parsedJson = await parseApiResponse(res);
  if (!res.ok) {
    throw new Error(parsedJson?.data?.message || "Failed to fetch appeal summary.");
  }

  return parsedJson?.data as AppealSummary;
}

export function getAppealEmailPreview(
  appeal: AppealTicket,
  resolution: AppealResolution,
  adminNote: string,
) {
  const subject =
    resolution === "REACTIVATE"
      ? `Your appeal ${appeal.ticket_number} has been approved`
      : `Update on your appeal ${appeal.ticket_number}`;

  const body =
    resolution === "REACTIVATE"
      ? `Hello ${appeal.full_name}, your appeal has been approved and your account can be reactivated. Admin note: ${adminNote || "No additional note provided."}`
      : `Hello ${appeal.full_name}, we reviewed your appeal and it was declined at this time. Admin note: ${adminNote || "No additional note provided."}`;

  return { subject, body };
}
