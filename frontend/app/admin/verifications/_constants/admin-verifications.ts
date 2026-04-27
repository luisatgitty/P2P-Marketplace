import {
  Clock,
  ShieldCheck,
  XCircle
} from 'lucide-react';

import { IdType, VerifStatus } from '../_types/admin-verifications';

export const VERIFICATION_REVIEW_REASON_MAX_LENGTH = 500;
export const ID_TYPE_OPTIONS: [IdType, string][] = [
  ['ALL', 'All ID Types'],
  ['philsys', 'National ID'],
  ['postal', 'Postal ID'],
  ['drivers', "Driver's License"],
  ['prc', 'PRC ID'],
  ['passport', 'Passport'],
  ['sss', 'UMID / SSS ID'],
  ['gsis', 'GSIS ID'],
  ['hdmf', 'HDMF ID'],
  ['voters', "Voter's ID"],
  ['acr', 'ACR (Foreigners)'],
];

export const STATUS_CONFIG: Record<
  VerifStatus,
  { cls: string; label: string; Icon: React.ElementType }
> = {
  PENDING: {
    cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    label: 'Pending',
    Icon: Clock,
  },
  VERIFIED: {
    cls: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
    label: 'Verified',
    Icon: ShieldCheck,
  },
  REJECTED: {
    cls: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    label: 'Rejected',
    Icon: XCircle,
  },
};
