'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function getGridDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = first.getDay();
  return Array.from(
    { length: 42 },
    (_, i) => new Date(year, month, 1 - offset + i),
  );
}

export interface BookingCalendarColors {
  solid: string;
  rangeFill: string;
  ringToday: string;
  hoverBg: string;
}

export interface BookingCalendarProps {
  viewYear: number;
  viewMonth: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  isUnavailable: (d: Date) => boolean;
  startDate: Date | null;
  endDate: Date | null;
  hoverDate: Date | null;
  onSelect: (d: Date) => void;
  onHover: (d: Date | null) => void;
  singleSelect?: boolean;
  colors: BookingCalendarColors;
  today?: Date;
  disablePast?: boolean;
}

export function BookingCalendar({
  viewYear,
  viewMonth,
  onPrevMonth,
  onNextMonth,
  isUnavailable,
  startDate,
  endDate,
  hoverDate,
  onSelect,
  onHover,
  singleSelect = false,
  colors,
  today = new Date(),
  disablePast = true,
}: BookingCalendarProps) {
  const cells = getGridDays(viewYear, viewMonth);
  const todayStart = startOfDay(today);

  const previewEnd = singleSelect ? null : (endDate ?? hoverDate);

  let lo: Date | null = null;
  let hi: Date | null = null;
  if (startDate && previewEnd) {
    const a = startOfDay(startDate).getTime();
    const b = startOfDay(previewEnd).getTime();
    lo = a <= b ? startOfDay(startDate) : startOfDay(previewEnd);
    hi = a <= b ? startOfDay(previewEnd) : startOfDay(startDate);
  }

  return (
    <div className='select-none'>
      <div className='mb-3 flex items-center justify-between'>
        <button
          type='button'
          onClick={onPrevMonth}
          className='flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-200 dark:text-stone-500 dark:hover:bg-[#252837]'
          aria-label='Previous month'
        >
          <ChevronLeft className='h-4 w-4' />
        </button>
        <span className='text-sm font-bold text-stone-900 dark:text-stone-50'>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type='button'
          onClick={onNextMonth}
          className='flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-200 dark:text-stone-500 dark:hover:bg-[#252837]'
          aria-label='Next month'
        >
          <ChevronRight className='h-4 w-4' />
        </button>
      </div>

      <div className='mb-1 grid grid-cols-7'>
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className='pb-1 text-center text-xs font-bold text-stone-400 dark:text-stone-600'
          >
            {label}
          </div>
        ))}
      </div>

      <div className='grid grid-cols-7'>
        {cells.map((date, i) => {
          if (date.getMonth() !== viewMonth) {
            return <div key={i} className='h-9' />;
          }

          const day = startOfDay(date);
          const unavailable = isUnavailable(date);
          const isPast = disablePast
            ? day.getTime() < todayStart.getTime()
            : false;
          const isToday = isSameDay(date, todayStart);
          const isStart = startDate ? isSameDay(date, startDate) : false;
          const isEnd = endDate ? isSameDay(date, endDate) : false;
          const isSelected = isStart || isEnd;

          const time = day.getTime();
          const inRange =
            !singleSelect && lo && hi
              ? time > lo.getTime() && time < hi.getTime()
              : false;

          const hasRange = lo && hi && lo.getTime() !== hi.getTime();
          const isRangeStart = !!(hasRange && lo && isSameDay(date, lo));
          const isRangeEnd = !!(hasRange && hi && isSameDay(date, hi));

          const disabled = unavailable || isPast;

          return (
            <div
              key={i}
              className='relative flex h-10 items-center justify-center'
            >
              {(inRange || isRangeStart || isRangeEnd) && (
                <div
                  className={cn(
                    'pointer-events-none absolute inset-y-1',
                    colors.rangeFill,
                    isRangeStart
                      ? 'left-1/2 right-0'
                      : isRangeEnd
                        ? 'left-0 right-1/2'
                        : 'left-0 right-0',
                  )}
                />
              )}

              <button
                type='button'
                disabled={disabled}
                onClick={() => !disabled && onSelect(date)}
                onMouseEnter={() => !disabled && onHover(date)}
                onMouseLeave={() => onHover(null)}
                className={cn(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-full',
                  'text-sm font-medium transition-all duration-100',
                  isPast &&
                    'cursor-not-allowed text-stone-300 dark:text-stone-700',
                  unavailable &&
                    !isPast && [
                      'cursor-not-allowed text-red-300 dark:text-red-900/60',
                      'line-through',
                    ],
                  !disabled &&
                    !isSelected && [
                      'cursor-pointer text-stone-700 dark:text-stone-200',
                      colors.hoverBg,
                    ],
                  isSelected && ['font-bold text-white', colors.solid],
                  isToday &&
                    !isSelected && [
                      'ring-2 ring-offset-1',
                      colors.ringToday,
                      'ring-offset-stone-50 dark:ring-offset-[#13151f]',
                    ],
                )}
              >
                {date.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
