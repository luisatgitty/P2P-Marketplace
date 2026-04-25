import type { PostCardProps } from '@/components/post-card';

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
  limit?: number;
  offset?: number;
};

export type HomeListingsResponse = {
  listings: HomeListing[];
  total: number;
  limit: number;
  offset: number;
};

export async function getHomeListings(
  query: HomeListingsQuery = {},
): Promise<HomeListingsResponse> {
  try {
    const params = new URLSearchParams();

    const entries: Array<[keyof HomeListingsQuery, string | undefined]> = [
      ['type', query.type],
      ['keyword', query.keyword],
      ['category', query.category],
      ['condition', query.condition],
      ['province', query.province],
      ['city', query.city],
      ['priceMin', query.priceMin],
      ['priceMax', query.priceMax],
      ['sort', query.sort],
      [
        'limit',
        typeof query.limit === 'number' ? String(query.limit) : undefined,
      ],
      [
        'offset',
        typeof query.offset === 'number' ? String(query.offset) : undefined,
      ],
    ];

    for (const [key, value] of entries) {
      const normalized = (value ?? '').trim();
      if (normalized) {
        params.set(key, normalized);
      }
    }

    const queryString = params.toString();
    const endpoint = `${process.env.NEXT_PUBLIC_API_URL}/listings${queryString ? `?${queryString}` : ''}`;

    const res = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
    });

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to fetch listings.';
    }

    return {
      listings: (parsedJson?.data?.listings ?? []) as HomeListing[],
      total: Number(parsedJson?.data?.total ?? 0),
      limit: Number(parsedJson?.data?.limit ?? query.limit ?? 0),
      offset: Number(parsedJson?.data?.offset ?? query.offset ?? 0),
    };
  } catch {
    throw 'An unexpected error occurred. Please try again later.';
  }
}
