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
