// Reusable GET helper (mirrors the post() helper in authService.ts)
export async function get(url: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const parsedJson = await response.json();
  if (!response.ok) {
    throw parsedJson.data.message;
  }
  return parsedJson.data;
}

// ── TYPES ──────────────────────────────────────────────────────────────────

export interface Listing {
  id: string;
  title: string;
  price: number;
  price_unit?: string;
  type: "sale" | "rent" | "service";
  location: string;
  posted_at: string;
  image_url: string;
  category?: string;
  seller: {
    name: string;
    rating?: number;
    avatar_url?: string;
    is_pro?: boolean;
  };
}

export interface ListingFilters {
  type?: "all" | "sale" | "rent" | "service";
  category?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "popular" | "near";
  page?: number;
  limit?: number;
}

// ── FUNCTIONS ──────────────────────────────────────────────────────────────
// Fetch all listings with optional filters
export async function getListings(filters: ListingFilters = {}): Promise<Listing[]> {
  const params = new URLSearchParams();
  if (filters.type && filters.type !== "all") params.append("type", filters.type);
  if (filters.category && filters.category !== "all") params.append("category", filters.category);
  if (filters.sort) params.append("sort", filters.sort);
  if (filters.page) params.append("page", String(filters.page));
  if (filters.limit) params.append("limit", String(filters.limit));

  const query = params.toString() ? `?${params.toString()}` : "";
  return get(`/listings${query}`);
}

// Fetch a single listing by ID
export async function getListingById(id: string): Promise<Listing> {
  return get(`/listings/${id}`);
}

// Fetch all categories
export async function getCategories(): Promise<{ id: string; name: string; emoji?: string }[]> {
  return get("/categories");
}