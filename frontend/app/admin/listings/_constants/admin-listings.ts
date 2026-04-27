import { ListingStatus } from '../_types/admin-listings';

export const STATUS_CONFIG: Record<ListingStatus, string> = {
  AVAILABLE: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
  UNAVAILABLE:
    'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  SOLD: 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400',
  BANNED: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
  DELETED: 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300',
};
