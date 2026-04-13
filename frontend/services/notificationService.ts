const API = process.env.NEXT_PUBLIC_API_URL ?? "";

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

async function apiFetch<T>(route: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${route}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const parsed = (await res.json()) as Partial<ApiSuccess<T>> & {
    data?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(parsed?.data?.message ?? "An unexpected error occurred. Please try again later.");
  }

  return (parsed.data ?? {}) as T;
}

export async function getNotifications(): Promise<NotificationDto[]> {
  const data = await apiFetch<{ notifications: NotificationDto[] }>("/notifications", {
    method: "GET",
  });
  return data.notifications ?? [];
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch<{ isSuccess: boolean }>("/notifications/read-all", {
    method: "PATCH",
  });
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await apiFetch<{ isSuccess: boolean }>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}
