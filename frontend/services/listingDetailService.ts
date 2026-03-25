import { PostCardProps } from "@/components/post-card";

export interface ListingExtra {
  description: string;
  condition: string;
  images: string[];
  features: string[];
  views: number;
  offers: number;
  deliveryMethod: string;
  minPeriod?: string;
  available_from?: string;
  availability?: string;
  deposit?: string;
  amenities?: string[];
  turnaround?: string;
  serviceArea?: string;
  arrangement?: string;
  inclusions?: string[];
}

export interface ListingDetailPayload {
  listing: PostCardProps;
  extra: ListingExtra;
  related: PostCardProps[];
  isBookmarked?: boolean;
}

export interface ListingReviewPayload {
  id: string;
  rating: number;
  comment: string;
}

export async function getListingDetailById(id: string): Promise<ListingDetailPayload> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listing/${id}`, {
      method: "GET",
      credentials: "include",
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to fetch listing details.";
    }

    return parsedJson.data as ListingDetailPayload;
  } catch {
    throw "An unexpected error occurred. Please try again later.";
  }
}

export async function addListingBookmark(id: string): Promise<void> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listing/${id}/bookmark`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      const parsedJson = await res.json();
      throw parsedJson?.data?.message || "Failed to bookmark listing.";
    }
  } catch (err) {
    if (typeof err === "string") throw err;
    if (err instanceof Error) throw err.message;
    throw "An unexpected error occurred. Please try again later.";
  }
}

export async function removeListingBookmark(id: string): Promise<void> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listing/${id}/bookmark`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      const parsedJson = await res.json();
      throw parsedJson?.data?.message || "Failed to remove bookmark.";
    }
  } catch (err) {
    if (typeof err === "string") throw err;
    if (err instanceof Error) throw err.message;
    throw "An unexpected error occurred. Please try again later.";
  }
}

export async function submitListingReport(id: string, reason: string, description: string): Promise<void> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listing/${id}/report`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason,
        description,
      }),
    });

    if (!res.ok) {
      const parsedJson = await res.json();
      throw parsedJson?.data?.message || "Failed to submit report.";
    }
  } catch (err) {
    if (typeof err === "string") throw err;
    if (err instanceof Error) throw err.message;
    throw "An unexpected error occurred. Please try again later.";
  }
}

export async function submitUserListingReport(
  id: string,
  reportedUserId: string,
  reason: string,
  description: string,
): Promise<void> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listing/${id}/report`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reportedUserId,
        reason,
        description,
      }),
    });

    if (!res.ok) {
      const parsedJson = await res.json();
      throw parsedJson?.data?.message || "Failed to submit report.";
    }
  } catch (err) {
    if (typeof err === "string") throw err;
    if (err instanceof Error) throw err.message;
    throw "An unexpected error occurred. Please try again later.";
  }
}

export async function markListingAsSold(id: string): Promise<void> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listing/${id}/mark-sold`, {
      method: "PATCH",
      credentials: "include",
    });

    if (!res.ok) {
      const parsedJson = await res.json();
      throw parsedJson?.data?.message || "Failed to mark listing as sold.";
    }
  } catch (err) {
    if (typeof err === "string") throw err;
    if (err instanceof Error) throw err.message;
    throw "An unexpected error occurred. Please try again later.";
  }
}

export async function getMyListingReview(id: string): Promise<ListingReviewPayload | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listing/${id}/review`, {
      method: "GET",
      credentials: "include",
    });

    if (res.status === 404) {
      return null;
    }

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to fetch review.";
    }

    return parsedJson.data as ListingReviewPayload;
  } catch (err) {
    if (typeof err === "string") throw err;
    if (err instanceof Error) throw err.message;
    throw "An unexpected error occurred. Please try again later.";
  }
}

export async function createListingReview(id: string, rating: number, comment: string): Promise<ListingReviewPayload> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listing/${id}/review`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rating, comment }),
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to submit review.";
    }

    return parsedJson.data as ListingReviewPayload;
  } catch (err) {
    if (typeof err === "string") throw err;
    if (err instanceof Error) throw err.message;
    throw "An unexpected error occurred. Please try again later.";
  }
}

export async function updateListingReview(id: string, rating: number, comment: string): Promise<ListingReviewPayload> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listing/${id}/review`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rating, comment }),
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to update review.";
    }

    return parsedJson.data as ListingReviewPayload;
  } catch (err) {
    if (typeof err === "string") throw err;
    if (err instanceof Error) throw err.message;
    throw "An unexpected error occurred. Please try again later.";
  }
}

export async function deleteListingReview(id: string): Promise<void> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listing/${id}/review`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      const parsedJson = await res.json();
      throw parsedJson?.data?.message || "Failed to delete review.";
    }
  } catch (err) {
    if (typeof err === "string") throw err;
    if (err instanceof Error) throw err.message;
    throw "An unexpected error occurred. Please try again later.";
  }
}
