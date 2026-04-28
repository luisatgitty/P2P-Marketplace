export const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type SortField = 'name' | 'created' | 'last_login' | 'updated' | 'deleted';
export type SortDir = 'asc' | 'desc';

export interface AdminAccount {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url: string;
  email: string;
  phone: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  updated_at: string;
  deleted_at: string | null;
  deleted_by_name: string;
  deleted_by_email: string;
  added_by: string;
};

export type AdminAccountRecord = {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url: string;
  email: string;
  phone: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  updated_at: string;
  deleted_at: string | null;
  deleted_by_name: string;
  deleted_by_email: string;
};

export type CreateAdminPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: AdminRole;
  password: string;
};

export type AdminAccountsQuery = {
  search?: string;
  role?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

export type AdminAccountsResponse = {
  admins: AdminAccountRecord[];
  total: number;
  limit: number;
  offset: number;
};
