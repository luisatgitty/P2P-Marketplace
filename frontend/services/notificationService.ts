const API = process.env.NEXT_PUBLIC_API_URL ?? '';

type ApiSuccess<T> = {
  retCode: string;
  message: string;
  data: T;
};

export type NotificationDto = {
  id: string;
  userId: string;
  type: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
};

export type NotificationsPageQuery = {
  limit?: number;
  offset?: number;
};

export type NotificationsPage = {
  notifications: NotificationDto[];
  total: number;
  limit: number;
  offset: number;
  unreadCount: number;
};

async function apiFetch<T>(route: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${route}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const parsed = (await res.json()) as Partial<ApiSuccess<T>> & {
    data?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(
      parsed?.data?.message ??
        'An unexpected error occurred. Please try again later.',
    );
  }

  return (parsed.data ?? {}) as T;
}

export async function getNotifications(): Promise<NotificationDto[]> {
  const data = await apiFetch<{ notifications: NotificationDto[] }>(
    '/notifications',
    {
      method: 'GET',
    },
  );
  return data.notifications ?? [];
}

export async function getNotificationsPage(
  query: NotificationsPageQuery = {},
): Promise<NotificationsPage> {
  const params = new URLSearchParams();
  if (Number.isFinite(query.limit)) {
    params.set('limit', String(query.limit));
  }
  if (Number.isFinite(query.offset)) {
    params.set('offset', String(query.offset));
  }

  const suffix = params.size > 0 ? `?${params.toString()}` : '';

  try {
    const data = await apiFetch<{
      notifications: NotificationDto[];
      total?: number;
      limit?: number;
      offset?: number;
      unreadCount?: number;
    }>(`/notifications${suffix}`, {
      method: 'GET',
    });

    const notifications = data.notifications ?? [];
    const total = Number(data.total ?? notifications.length);
    const limit = Number(data.limit ?? query.limit ?? notifications.length);
    const offset = Number(data.offset ?? query.offset ?? 0);
    const unreadCount = Number(
      data.unreadCount ?? notifications.filter((item) => !item.isRead).length,
    );

    return {
      notifications,
      total,
      limit,
      offset,
      unreadCount,
    };
  } catch {
    return {
      notifications: [],
      total: 0,
      limit: Number(query.limit ?? 0),
      offset: Number(query.offset ?? 0),
      unreadCount: 0,
    };
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch<{ isSuccess: boolean }>('/notifications/read-all', {
    method: 'PATCH',
  });
}

export async function markNotificationRead(
  notificationId: string,
): Promise<void> {
  await apiFetch<{ isSuccess: boolean }>(
    `/notifications/${notificationId}/read`,
    {
      method: 'PATCH',
    },
  );
}
