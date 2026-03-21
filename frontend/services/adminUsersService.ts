export type AdminUserRecord = {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url: string;
  email: string;
  phone: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  verification: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
  is_active: boolean;
  is_email_verified: boolean;
  failed_login: number;
  listings: number;
  last_login: string | null;
  joined: string;
  location: string;
};

export async function getAdminUsers(): Promise<AdminUserRecord[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users`, {
      method: "GET",
      credentials: "include",
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to fetch users.";
    }

    return (parsedJson?.data?.users ?? []) as AdminUserRecord[];
  } catch {
    throw "An unexpected error occurred. Please try again later.";
  }
}

export async function setAdminUserActive(userId: string, isActive: boolean): Promise<void> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users/${encodeURIComponent(userId)}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isActive }),
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to update user status.";
    }
  } catch (error: any) {
    throw error?.message || "An unexpected error occurred. Please try again later.";
  }
}

export async function deleteAdminUser(userId: string): Promise<void> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      credentials: "include",
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to delete user.";
    }
  } catch (error: any) {
    throw error?.message || "An unexpected error occurred. Please try again later.";
  }
}
