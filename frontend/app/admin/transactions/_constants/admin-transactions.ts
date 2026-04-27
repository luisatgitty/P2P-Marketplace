import {
  Home,
  ShoppingBag,
  Wrench
} from 'lucide-react';

import { type ListingTypeU } from '@/types/listings';
import { TransactionStatus } from '../_types/admin-transactions';

export const TYPE_CONFIG: Record<
  ListingTypeU,
  { label: string; cls: string; Icon: React.ElementType }
> = {
  SELL: {
    label: 'For Sale',
    cls: 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300',
    Icon: ShoppingBag,
  },
  RENT: {
    label: 'For Rent',
    cls: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
    Icon: Home,
  },
  SERVICE: {
    label: 'Service',
    cls: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
    Icon: Wrench,
  },
};

export const STATUS_CONFIG: Record<TransactionStatus, string> = {
  PENDING:
    'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  CONFIRMED: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  COMPLETED: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
  CANCELLED: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300',
};
