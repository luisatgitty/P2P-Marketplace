import type { PostCardProps } from "@/components/post-card";

export type HomeListing = PostCardProps & {
  category: string;
  condition: string;
  createdAt: number;
};

export type HomeListingsQuery = {
  type?: string;
  keyword?: string;
  category?: string;
  condition?: string;
  province?: string;
  city?: string;
  priceMin?: string;
  priceMax?: string;
  sort?: string;
};

export async function getHomeListings(query: HomeListingsQuery = {}): Promise<HomeListing[]> {
  try {
    const params = new URLSearchParams();

    const entries: Array<[keyof HomeListingsQuery, string | undefined]> = [
      ["type", query.type],
      ["keyword", query.keyword],
      ["category", query.category],
      ["condition", query.condition],
      ["province", query.province],
      ["city", query.city],
      ["priceMin", query.priceMin],
      ["priceMax", query.priceMax],
      ["sort", query.sort],
    ];

    for (const [key, value] of entries) {
      const normalized = (value ?? "").trim();
      if (normalized) {
        params.set(key, normalized);
      }
    }

    const queryString = params.toString();
    const endpoint = `${process.env.NEXT_PUBLIC_API_URL}/listings${queryString ? `?${queryString}` : ""}`;

    const res = await fetch(endpoint, {
      method: "GET",
      credentials: "include",
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || "Failed to fetch listings.";
    }

    return (parsedJson?.data?.listings ?? []) as HomeListing[];
  } catch {
    throw "An unexpected error occurred. Please try again later.";
  }
}
