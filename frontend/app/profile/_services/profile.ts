import {
  appendProfileQueryParams,
  ProfilePayload,
  ProfilePageQuery
} from '@/services/profileService';

export async function getProfileData(
  query?: ProfilePageQuery,
): Promise<ProfilePayload> {
  try {
    const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/profile/me`);
    appendProfileQueryParams(url, query);

    const res = await fetch(url.toString(), {
      method: 'GET',
      credentials: 'include',
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to fetch profile data.';
    }

    return parsedJson.data as ProfilePayload;
  } catch {
    throw 'An unexpected error occurred. Please try again later.';
  }
}

export async function deactivateProfile(): Promise<void> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/me`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!res.ok) {
      const parsedJson = await res.json();
      throw parsedJson?.data?.message || 'Failed to deactivate account.';
    }
  } catch (err) {
    if (typeof err === 'string') throw err;
    if (err instanceof Error) throw err.message;
    throw 'An unexpected error occurred. Please try again later.';
  }
}
