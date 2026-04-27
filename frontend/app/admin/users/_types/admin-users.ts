export type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN';
export type VerifStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type SortDir = 'asc' | 'desc';
export type SortField =
  | 'name'
  | 'email'
  | 'role'
  | 'verification'
  | 'joined'
  | 'last_login'
  | 'listings'
  | 'locked_until'
  | 'updated'
  | 'deleted';

export interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url: string;
  email: string;
  phone: string | null;
  role: Role;
  verification: VerifStatus;
  is_active: boolean;
  is_email_verified: boolean;
  failed_login: number;
  listings: number;
  client_transactions: number;
  owner_transactions: number;
  account_locked_until: string | null;
  last_login: string | null;
  joined: string;
  updated_at: string;
  deleted_at: string | null;
  action_by_name: string;
  action_by_email: string;
  location: string;
};

export type AdminUserRecord = {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url: string;
  email: string;
  phone: string;
  role: Role;
  verification: VerifStatus;
  is_active: boolean;
  is_email_verified: boolean;
  failed_login: number;
  listings: number;
  client_transactions: number;
  owner_transactions: number;
  account_locked_until: string | null;
  last_login: string | null;
  joined: string;
  updated_at: string;
  deleted_at: string | null;
  action_by_name: string;
  action_by_email: string;
  location: string;
};

export type AdminUsersQuery = {
  search?: string;
  status?: string;
  verified?: string;
  limit?: number;
  offset?: number;
};

export type AdminUsersResponse = {
  users: AdminUserRecord[];
  total: number;
  limit: number;
  offset: number;
};
