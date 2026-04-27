export async function addListingBookmark(id: string): Promise<void> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/listing/${id}/bookmark`,
      {
        method: 'POST',
        credentials: 'include',
      },
    );

    if (!res.ok) {
      const parsedJson = await res.json();
      throw parsedJson?.data?.message || 'Failed to bookmark listing.';
    }
  } catch (err) {
    if (typeof err === 'string') throw err;
    if (err instanceof Error) throw err.message;
    throw 'An unexpected error occurred. Please try again later.';
  }
}

export async function deleteListing(
  id: string,
): Promise<{ listingId: string; status: 'DELETED' }> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/listing/${encodeURIComponent(id)}`,
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

export async function removeListingBookmark(id: string): Promise<void> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/listing/${id}/bookmark`,
      {
        method: 'DELETE',
        credentials: 'include',
      },
    );

    if (!res.ok) {
      const parsedJson = await res.json();
      throw parsedJson?.data?.message || 'Failed to remove bookmark.';
    }
  } catch (err) {
    if (typeof err === 'string') throw err;
    if (err instanceof Error) throw err.message;
    throw 'An unexpected error occurred. Please try again later.';
  }
}

export async function submitListingReport(
  id: string,
  reason: string,
  description: string,
): Promise<void> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/listing/${id}/report`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
          description,
        }),
      },
    );

    if (!res.ok) {
      const parsedJson = await res.json();
      throw parsedJson?.data?.message || 'Failed to submit report.';
    }
  } catch (err) {
    if (typeof err === 'string') throw err;
    if (err instanceof Error) throw err.message;
    throw 'An unexpected error occurred. Please try again later.';
  }
}

export async function toggleListingVisibility(
  id: string,
): Promise<{ listingId: string; status: 'AVAILABLE' | 'UNAVAILABLE' }> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/listing/${encodeURIComponent(id)}/toggle-visibility`,
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
