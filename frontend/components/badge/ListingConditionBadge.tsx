import { cn } from '@/lib/utils';

const CONDITION_COLOR_MAP: Record<string, string> = {
  'brand new':
    'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
  'like new':
    'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  good: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  fair: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  'for parts': 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
};

function normalizeCondition(condition?: string | null): string {
  return String(condition ?? '')
    .trim()
    .toLowerCase();
}

interface ListingConditionBadgeProps {
  condition?: string | null;
  className?: string;
}

export default function ListingConditionBadge({
  condition,
  className,
}: ListingConditionBadgeProps) {
  const normalizedCondition = normalizeCondition(condition);
  if (!normalizedCondition) return null;

  const label = String(condition ?? '').trim();
  const colorClass =
    CONDITION_COLOR_MAP[normalizedCondition] ??
    'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300';

  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md',
        colorClass,
        className,
      )}
    >
      {label}
    </span>
  );
}
