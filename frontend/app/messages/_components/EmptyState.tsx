import { Search } from 'lucide-react';

import { TAB_META } from '../_constants/messages';
import type { EmptyStateProps } from '../_types/messages';

export default function EmptyState({ tab, hasSearch }: EmptyStateProps) {
  const { icon: Icon, title, body } = TAB_META[tab];

  if (hasSearch) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-[#252837] flex items-center justify-center">
          <Search size={20} className="text-stone-400 dark:text-stone-500" />
        </div>
        <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          No results found
        </p>
        <p className="text-xs text-stone-400 dark:text-stone-500">
          Try a different name, listing, or keyword.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-lg bg-stone-100 dark:bg-[#252837] flex items-center justify-center">
        <Icon size={24} className="text-stone-400 dark:text-stone-500" />
      </div>
      <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
        {title}
      </p>
      <p className="text-xs text-stone-400 dark:text-stone-500 max-w-50 leading-relaxed">
        {body}
      </p>
    </div>
  );
}
