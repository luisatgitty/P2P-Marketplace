const WEEKDAYS = new Set([
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]);

const PH_REGULAR_HOLIDAY_CACHE = new Map<number, Set<string>>();

export const DAY_OFF_OPTIONS = [
  'Holiday',
  'Saturday',
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
] as const;

export interface DaysOffRules {
  dateSet: Set<string>;
  weekdaySet: Set<string>;
  includeHoliday: boolean;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateOnly(value?: string): Date | null {
  if (!value || !value.trim()) return null;
  const clean = value.trim().slice(0, 10);
  const parts = clean.split('-');
  if (parts.length !== 3) return null;

  const year = Number.parseInt(parts[0], 10);
  const month = Number.parseInt(parts[1], 10);
  const day = Number.parseInt(parts[2], 10);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  return startOfDay(parsed);
}

function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function shiftDays(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

function getLastMondayOfAugust(year: number): Date {
  const lastDay = new Date(year, 7, 31);
  const diff = (lastDay.getDay() - 1 + 7) % 7;
  return new Date(year, 7, 31 - diff);
}

export function getPhilippineRegularHolidaySet(year: number): Set<string> {
  const cached = PH_REGULAR_HOLIDAY_CACHE.get(year);
  if (cached) return cached;

  const set = new Set<string>();
  const fixed = ['01-01', '04-09', '05-01', '06-12', '11-30', '12-25', '12-30'];
  for (const monthDay of fixed) {
    set.add(`${year}-${monthDay}`);
  }

  const easterSunday = getEasterSunday(year);
  set.add(toISODate(shiftDays(easterSunday, -3))); // Maundy Thursday
  set.add(toISODate(shiftDays(easterSunday, -2))); // Good Friday
  set.add(toISODate(getLastMondayOfAugust(year))); // National Heroes Day

  PH_REGULAR_HOLIDAY_CACHE.set(year, set);
  return set;
}

export function normalizeDaysOff(
  daysOffInput: string[] | string | undefined | null,
): DaysOffRules {
  const dateSet = new Set<string>();
  const weekdaySet = new Set<string>();
  let includeHoliday = false;

  const rawItems = Array.isArray(daysOffInput)
    ? daysOffInput
    : typeof daysOffInput === 'string'
      ? daysOffInput.split(',')
      : [];

  for (const item of rawItems) {
    const trimmed = item.trim();
    if (!trimmed) continue;

    const normalized = trimmed.toLowerCase();
    if (normalized === 'holiday') {
      includeHoliday = true;
      continue;
    }

    if (WEEKDAYS.has(normalized)) {
      weekdaySet.add(normalized);
      continue;
    }

    const parsedDate = parseDateOnly(trimmed);
    if (parsedDate) {
      dateSet.add(toISODate(parsedDate));
    }
  }

  return { dateSet, weekdaySet, includeHoliday };
}

export function isDayUnavailableByDaysOff(
  date: Date,
  daysOffInput: string[] | string | DaysOffRules,
  options?: { includePast?: boolean; minDate?: Date | null },
): boolean {
  const day = startOfDay(date);
  const includePast = Boolean(options?.includePast);
  const minDate = options?.minDate ? startOfDay(options.minDate) : null;

  if (includePast && day.getTime() < startOfDay(new Date()).getTime()) {
    return true;
  }

  if (minDate && day.getTime() < minDate.getTime()) {
    return true;
  }

  const rules =
    Array.isArray(daysOffInput) || typeof daysOffInput === 'string'
      ? normalizeDaysOff(daysOffInput)
      : daysOffInput;

  const weekday = day
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase();
  if (rules.weekdaySet.has(weekday)) {
    return true;
  }

  if (rules.includeHoliday) {
    const holidaySet = getPhilippineRegularHolidaySet(day.getFullYear());
    if (holidaySet.has(toISODate(day))) {
      return true;
    }
  }

  return rules.dateSet.has(toISODate(day));
}
