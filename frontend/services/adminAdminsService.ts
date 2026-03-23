export type AdminAccountRecord = {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url: string;
  email: string;
  phone: string;
  role: "ADMIN" | "SUPER_ADMIN";
  is_active: boolean;
  created_at: string;
  last_login: string | null;
};

export type CreateAdminPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: "ADMIN" | "SUPER_ADMIN";
  password: string;
};

export async function getAdminAccounts(): Promise<AdminAccountRecord[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/admins`, {
      method: "GET",
      credentials: "include",
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to fetch admin accounts.";
    }

    return (parsedJson?.data?.admins ?? []) as AdminAccountRecord[];
  } catch {
    throw "An unexpected error occurred. Please try again later.";
  }
}

export async function createAdminAccount(payload: CreateAdminPayload): Promise<AdminAccountRecord> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/admins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to create admin account.";
    }

    return parsedJson?.data?.admin as AdminAccountRecord;
  } catch (error: any) {
    throw error?.message || "An unexpected error occurred. Please try again later.";
  }
}

export async function deleteAdminAccount(adminId: string): Promise<void> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/admins/${encodeURIComponent(adminId)}`, {
      method: "DELETE",
      credentials: "include",
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to remove admin account.";
    }
  } catch (error: any) {
    throw error?.message || "An unexpected error occurred. Please try again later.";
  }
}
