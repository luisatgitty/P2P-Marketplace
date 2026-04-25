'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

type ThemeModeSwitchProps = {
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
};

export function ThemeModeSwitch({
  className,
  showLabel = true,
  compact = false,
}: ThemeModeSwitchProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const effectiveTheme = resolvedTheme ?? theme;
  const isDarkMode = effectiveTheme === 'dark';
  const label = isDarkMode ? 'Dark Mode' : 'Light Mode';

  return (
    <button
      type='button'
      onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
      role='switch'
      aria-checked={isDarkMode}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={!showLabel ? (isDarkMode ? 'Light Mode' : 'Dark Mode') : undefined}
      className={cn(
        'flex items-center rounded-lg transition-all text-slate-300 cursor-pointer',
        compact
          ? 'justify-center w-8 h-10'
          : showLabel
            ? 'justify-between w-full px-3 py-2.5 text-sm font-medium'
            : 'justify-center w-full px-3 py-2.5',
        className,
      )}
    >
      {showLabel && !compact && <span>{label}</span>}

      <span
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          mounted && isDarkMode ? 'bg-sky-500/70' : 'bg-slate-600/70',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition-transform duration-200',
            mounted && isDarkMode
              ? // Switch between 2px and 5px translation to better center the icon when label is hidden vs shown
                showLabel && !compact
                ? 'translate-x-5'
                : 'translate-x-2'
              : 'translate-x-0',
          )}
        >
          {mounted && isDarkMode ? (
            <Moon className='h-3 w-3' />
          ) : (
            <Sun className='h-3 w-3' />
          )}
        </span>
      </span>
    </button>
  );
}
