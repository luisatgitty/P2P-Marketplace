export type AdminAccountRecord = {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  updated_at: string;
  deleted_at: string | null;
  deleted_by_name: string;
  deleted_by_email: string;
};

export type CreateAdminPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  password: string;
};

export type AdminAccountsQuery = {
  search?: string;
  role?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

export type AdminAccountsResponse = {
  admins: AdminAccountRecord[];
  total: number;
  limit: number;
  offset: number;
};

export async function getAdminAccounts(
  query?: AdminAccountsQuery,
): Promise<AdminAccountsResponse> {
  try {
    const params = new URLSearchParams();
    if (query?.search) params.set('search', query.search);
    if (query?.role) params.set('role', query.role);
    if (query?.status) params.set('status', query.status);
    if (typeof query?.limit === 'number')
      params.set('limit', String(query.limit));
    if (typeof query?.offset === 'number')
      params.set('offset', String(query.offset));

    const querySuffix = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/admins${querySuffix}`,
      {
        method: 'GET',
        credentials: 'include',
      },
    );

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to fetch admin accounts.';
    }

    return {
      admins: (parsedJson?.data?.admins ?? []) as AdminAccountRecord[],
      total: Number(parsedJson?.data?.total ?? 0),
      limit: Number(parsedJson?.data?.limit ?? query?.limit ?? 0),
      offset: Number(parsedJson?.data?.offset ?? query?.offset ?? 0),
    };
  } catch {
    throw 'An unexpected error occurred. Please try again later.';
  }
}

export async function createAdminAccount(
  payload: CreateAdminPayload,
): Promise<AdminAccountRecord> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to create admin account.';
    }

    return parsedJson?.data?.admin as AdminAccountRecord;
  } catch (error: any) {
    throw (
      error?.message || 'An unexpected error occurred. Please try again later.'
    );
  }
}

export async function deleteAdminAccount(adminId: string): Promise<void> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/admins/${encodeURIComponent(adminId)}`,
      {
        method: 'DELETE',
        credentials: 'include',
      },
    );

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to remove admin account.';
    }
  } catch (error: any) {
    throw (
      error?.message || 'An unexpected error occurred. Please try again later.'
    );
  }
}

export async function setAdminAccountActive(
  adminId: string,
  isActive: boolean,
): Promise<void> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/admins/${encodeURIComponent(adminId)}/active`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive }),
      },
    );

    const parsedJson = await res.json();
    if (!res.ok) {
      throw (
        parsedJson?.data?.message || 'Failed to update admin account status.'
      );
    }
  } catch (error: any) {
    throw (
      error?.message || 'An unexpected error occurred. Please try again later.'
    );
  }
}
