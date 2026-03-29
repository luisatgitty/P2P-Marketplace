export type AdminReportRecord = {
  id: string;
  reporter_id: string;
  reporter: string;
  reporter_profile_image_url: string;
  reporter_location: string;
  target_type: "LISTING" | "USER";
  target_name: string;
  target_id: string;
  listing_image_url: string;
  listing_price: number;
  listing_price_unit: string;
  listing_owner_id: string;
  listing_owner: string;
  listing_owner_profile_image_url: string;
  listing_owner_location: string;
  reason: string;
  description: string | null;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export async function getAdminReports(): Promise<AdminReportRecord[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/reports`, {
      method: "GET",
      credentials: "include",
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to fetch reports.";
    }

    return (parsedJson?.data?.reports ?? []) as AdminReportRecord[];
  } catch {
    throw "An unexpected error occurred. Please try again later.";
  }
}

export async function setAdminReportStatus(
  reportId: string,
  status: "RESOLVED" | "DISMISSED",
): Promise<void> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/reports/${encodeURIComponent(reportId)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to update report status.";
    }
  } catch (error: any) {
    throw error?.message || "An unexpected error occurred. Please try again later.";
  }
}
