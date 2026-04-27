import {
  CheckCircle2,
  Clock,
  ShieldX,
  Trash2
} from 'lucide-react';

import {
  type ReportStatus,
  type ActionOption
} from '../_types/admin-reports';

export const STATUS_CONFIG: Record<ReportStatus, { cls: string; label: string }> = {
  PENDING: {
    cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    label: 'Pending',
  },
  RESOLVED: {
    cls: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
    label: 'Resolved',
  },
  DISMISSED: {
    cls: 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400',
    label: 'Dismissed',
  },
};

export const ACTION_OPTIONS: ActionOption[] = [
  {
    value: 'DISMISS',
    label: 'Dismiss Report',
    description: 'No necessary action needed.',
    icon: CheckCircle2,
    severity: 'low',
    group: 'Minor Actions',
  },
  {
    value: 'BAN_LISTING',
    label: 'Shadow Ban Listing',
    description: 'Shadow ban the listing for 1 day',
    icon: ShieldX,
    severity: 'medium',
    group: 'Minor Actions',
  },
  {
    value: 'LOCK_3',
    label: 'Lockout 1st Offense',
    description: 'Temporarily restrict account access for 3 Days',
    icon: Clock,
    severity: 'high',
    group: 'Account Lockout',
  },
  {
    value: 'LOCK_7',
    label: 'Lockout 2nd Offense',
    description: 'Temporarily restrict account access for 7 Days',
    icon: Clock,
    severity: 'high',
    group: 'Account Lockout',
  },
  {
    value: 'LOCK_30',
    label: 'Lockout 3rd Offense',
    description: 'Extended account restriction for 30 Days',
    icon: Clock,
    severity: 'high',
    group: 'Account Lockout',
  },
  {
    value: 'DELETE_LISTING',
    label: 'Delete Listing',
    description: 'Permanently remove the listing, and notify the owner.',
    icon: Trash2,
    severity: 'high',
    group: 'Permanent Actions',
  },
  {
    value: 'PERMANENT_BAN',
    label: 'Ban Account',
    description: 'Irreversibly ban account from the platform',
    icon: ShieldX,
    severity: 'critical',
    group: 'Permanent Actions',
  },
];

export const SEVERITY_STYLES: Record<
  ActionOption['severity'],
  {
    idle: string;
    selected: string;
    dot: string;
  }
> = {
  low: {
    idle: 'border-stone-200 dark:border-[#2a2d3e] hover:border-teal-300 dark:hover:border-teal-700',
    selected:
      'border-teal-400 dark:border-teal-500 bg-teal-50 dark:bg-teal-950/30 ring-1 ring-teal-400/40',
    dot: 'bg-teal-500',
  },
  medium: {
    idle: 'border-stone-200 dark:border-[#2a2d3e] hover:border-amber-300 dark:hover:border-amber-700',
    selected:
      'border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-400/40',
    dot: 'bg-amber-500',
  },
  high: {
    idle: 'border-stone-200 dark:border-[#2a2d3e] hover:border-orange-300 dark:hover:border-orange-700',
    selected:
      'border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-950/30 ring-1 ring-orange-400/40',
    dot: 'bg-orange-500',
  },
  critical: {
    idle: 'border-stone-200 dark:border-[#2a2d3e] hover:border-red-300 dark:hover:border-red-700',
    selected:
      'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-950/30 ring-1 ring-red-400/40',
    dot: 'bg-red-500',
  },
};

export const ACTION_GROUPS = ['Minor Actions', 'Account Lockout', 'Permanent Actions'];
