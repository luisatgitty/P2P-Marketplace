import type { PostCardProps } from "@/components/post-card";

export type HomeListing = PostCardProps & {
  category: string;
  condition: string;
  createdAt: number;
};

export async function getHomeListings(): Promise<HomeListing[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listings`, {
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
