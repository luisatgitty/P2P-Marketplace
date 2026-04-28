export type IdType =
  | 'ALL'
  | 'philsys'
  | 'postal'
  | 'drivers'
  | 'prc'
  | 'passport'
  | 'sss'
  | 'gsis'
  | 'hdmf'
  | 'voters'
  | 'acr';
export type SortDir = 'asc' | 'desc';
export type SortField = 'applicant' | 'dateOfBirth' | 'submitted' | 'reviewedBy';
export type VerifStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export type AdminVerificationStatusPayload = {
  status: 'VERIFIED' | 'REJECTED';
  reason: string;
};

export interface AdminVerification {
  id: string;
  user_id: string;
  // Registered profile
  user_name: string;
  user_email: string;
  profile_image_url: string;
  // Submitted personal info (from become-seller form)
  id_first_name: string;
  id_last_name: string;
  id_birthdate: string;
  id_birthdate_raw: string;
  mobile_number: string;
  // ID document
  id_type: string;
  id_number: string;
  id_image_front_url: string;
  id_image_back_url: string;
  selfie_url: string;
  // Submission metadata
  ip_address: string;
  user_agent: string;
  hardware_info: string; // JSON string from getDeviceInfo()
  // Review state
  status: VerifStatus;
  reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewed_at_raw: string | null;
  submitted_at_raw: string;
  submitted_date: string;
  submitted_time: string;
}

export type AdminVerificationRecord = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  profile_image_url: string;
  id_first_name: string;
  id_last_name: string;
  id_birthdate: string;
  mobile_number: string;
  id_type: string;
  id_number: string;
  id_image_front_url: string;
  id_image_back_url: string;
  selfie_url: string;
  ip_address: string;
  user_agent: string;
  hardware_info: string;
  status: VerifStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_at: string;
};

export type AdminVerificationsQuery = {
  search?: string;
  status?: string;
  idType?: string;
  limit?: number;
  offset?: number;
};

export type AdminVerificationsResponse = {
  verifications: AdminVerificationRecord[];
  total: number;
  limit: number;
  offset: number;
};
