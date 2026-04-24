export type AppealStatus = "PENDING" | "REACTIVATED" | "DECLINED";

export type AppealCategory =
  | "ACCOUNT_DEACTIVATION"
  | "ACCOUNT_LOCKED"
  | "VERIFICATION_REVIEW"
  | "OTHER";

export type AppealResolution = "REACTIVATE" | "DECLINE";

export type EmailNotificationStatus = "PENDING" | "SENT" | "FAILED";

export interface AppealTicket {
  id: string;
  ticket_number: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  category: AppealCategory;
  subject: string;
  message: string;
  evidence_url: string | null;
  status: AppealStatus;
  resolution: AppealResolution | null;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  email_notification_status: EmailNotificationStatus;
}

export interface AppealSummary {
  total: number;
  pending: number;
  reactivated: number;
  declined: number;
}
