export type AdminTransactionRecord = {
  id: string;
  listing_id: string;
  listing_type: 'SELL' | 'RENT' | 'SERVICE';
  listing_title: string;
  listing_price_unit: string;
  listing_image_url: string;

  client_user_id: string;
  client_full_name: string;
  client_location: string;
  client_profile_image_url: string;

  owner_user_id: string;
  owner_full_name: string;
  owner_location: string;
  owner_profile_image_url: string;

  start_date?: string | null;
  end_date?: string | null;
  selected_time_window?: string;

  total_price: number;
  schedule_units: number;
  provider_agreed: boolean;
  client_agreed: boolean;

  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  completed_at?: string | null;
  created_at: string;
};

export type AdminTransactionsQuery = {
  search?: string;
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

export type AdminTransactionsResponse = {
  transactions: AdminTransactionRecord[];
  total: number;
  limit: number;
  offset: number;
};

export async function getAdminTransactions(
  query?: AdminTransactionsQuery,
): Promise<AdminTransactionsResponse> {
  try {
    const params = new URLSearchParams();
    if (query?.search) params.set('search', query.search);
    if (query?.type) params.set('type', query.type);
    if (query?.status) params.set('status', query.status);
    if (typeof query?.limit === 'number')
      params.set('limit', String(query.limit));
    if (typeof query?.offset === 'number')
      params.set('offset', String(query.offset));

    const querySuffix = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/transactions${querySuffix}`,
      {
        method: 'GET',
        credentials: 'include',
      },
    );

    const parsedJson = await res.json();
    if (!res.ok) {
      throw parsedJson?.data?.message || 'Failed to fetch transactions.';
    }

    return {
      transactions: (parsedJson?.data?.transactions ??
        []) as AdminTransactionRecord[],
      total: Number(parsedJson?.data?.total ?? 0),
      limit: Number(parsedJson?.data?.limit ?? query?.limit ?? 0),
      offset: Number(parsedJson?.data?.offset ?? query?.offset ?? 0),
    };
  } catch {
    throw 'An unexpected error occurred. Please try again later.';
  }
}
