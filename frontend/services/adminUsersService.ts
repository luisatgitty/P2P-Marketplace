export type AdminUserRecord = {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url: string;
  email: string;
  phone: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  verification: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  is_active: boolean;
  is_email_verified: boolean;
  failed_login: number;
  listings: number;
  client_transactions: number;
  owner_transactions: number;
  account_locked_until: string | null;
  last_login: string | null;
  joined: string;
  updated_at: string;
  deleted_at: string | null;
  action_by_name: string;
  action_by_email: string;
  location: string;
};

export type AdminUsersQuery = {
  search?: string;
  status?: string;
  verified?: string;
  limit?: number;
  offset?: number;
};

export type AdminUsersResponse = {
  users: AdminUserRecord[];
  total: number;
  limit: number;
  offset: number;
};

export async function getAdminUsers(
  query?: AdminUsersQuery,
): Promise<AdminUsersResponse> {
  try {
    const params = new URLSearchParams();
    if (query?.search) params.set('search', query.search);
    if (query?.status) params.set('status', query.status);
    if (query?.verified) params.set('verified', query.verified);
    if (typeof query?.limit === 'number')
      params.set('limit', String(query.limit));
    if (typeof query?.offset === 'number')
      params.set('offset', String(query.offset));

    const querySuffix = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/users${querySuffix}`,
      {
        method: 'GET',
        credentials: 'include',
      },
    );

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to fetch users.';
    }

    return {
      users: (parsedJson?.data?.users ?? []) as AdminUserRecord[],
      total: Number(parsedJson?.data?.total ?? 0),
      limit: Number(parsedJson?.data?.limit ?? query?.limit ?? 0),
      offset: Number(parsedJson?.data?.offset ?? query?.offset ?? 0),
    };
  } catch {
    throw 'An unexpected error occurred. Please try again later.';
  }
}

export async function setAdminUserActive(
  userId: string,
  isActive: boolean,
): Promise<void> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/users/${encodeURIComponent(userId)}/active`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive }),
      },
    );

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to update user status.';
    }
  } catch (error: any) {
    throw (
      error?.message || 'An unexpected error occurred. Please try again later.'
    );
  }
}

export async function deleteAdminUser(userId: string): Promise<void> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/users/${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
        credentials: 'include',
      },
    );

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to delete user.';
    }
  } catch (error: any) {
    throw (
      error?.message || 'An unexpected error occurred. Please try again later.'
    );
  }
}
