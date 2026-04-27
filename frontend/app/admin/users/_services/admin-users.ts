import {
  type AdminUsersQuery,
  type AdminUsersResponse,
  type AdminUserRecord
} from '../_types/admin-users';

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
