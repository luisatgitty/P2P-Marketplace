import {
  type AdminListingRecord,
  type AdminListingsQuery,
  type AdminListingsResponse,
} from '../_types/admin-listings';

export async function getAdminListings(
  query?: AdminListingsQuery,
): Promise<AdminListingsResponse> {
  try {
    const params = new URLSearchParams();
    if (query?.search) params.set('search', query.search);
    if (query?.type) params.set('type', query.type);
    if (query?.status) params.set('status', query.status);
    if (query?.category) params.set('category', query.category);
    if (typeof query?.limit === 'number')
      params.set('limit', String(query.limit));
    if (typeof query?.offset === 'number')
      params.set('offset', String(query.offset));

    const querySuffix = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/listings${querySuffix}`,
      {
        method: 'GET',
        credentials: 'include',
      },
    );

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to fetch listings.';
    }

    return {
      listings: (parsedJson?.data?.listings ?? []) as AdminListingRecord[],
      total: Number(parsedJson?.data?.total ?? 0),
      limit: Number(parsedJson?.data?.limit ?? query?.limit ?? 0),
      offset: Number(parsedJson?.data?.offset ?? query?.offset ?? 0),
    };
  } catch {
    throw 'An unexpected error occurred. Please try again later.';
  }
}

export async function deleteAdminListing(
  listingId: string,
): Promise<{ listingId: string; status: 'DELETED' }> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/listings/${encodeURIComponent(listingId)}`,
      {
        method: 'DELETE',
        credentials: 'include',
      },
    );

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to remove listing.';
    }

    return {
      listingId: parsedJson?.data?.listingId,
      status: parsedJson?.data?.status,
    };
  } catch (error: any) {
    throw (
      error?.message || 'An unexpected error occurred. Please try again later.'
    );
  }
}

export async function toggleAdminListingVisibility(
  listingId: string,
): Promise<{ listingId: string; status: 'BANNED' | 'UNAVAILABLE' }> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/listings/${encodeURIComponent(listingId)}/toggle-visibility`,
      {
        method: 'PATCH',
        credentials: 'include',
      },
    );

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to update listing visibility.';
    }

    return {
      listingId: parsedJson?.data?.listingId,
      status: parsedJson?.data?.status,
    };
  } catch (error: any) {
    throw (
      error?.message || 'An unexpected error occurred. Please try again later.'
    );
  }
}
