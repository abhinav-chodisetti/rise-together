// JS Date.getDay() convention: 0 = Sun, 6 = Sat.
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export const WEEKDAY_LABELS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
export const WEEKDAY_LABELS_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function isScheduledToday(days: Weekday[], today: Date = new Date()): boolean {
  return days.includes(today.getDay() as Weekday);
}

export function formatSchedule(days: Weekday[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 7) return 'Daily';
  if (sorted.length === 5 && sorted.every((d, i) => d === i + 1)) return 'Weekdays';
  if (sorted.length === 2 && sorted[0] === 0 && sorted[1] === 6) return 'Weekends';
  return sorted.map((d) => WEEKDAY_LABELS_FULL[d]).join(' · ');
}

export function isValidWeekdayArray(value: unknown): value is Weekday[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 7 &&
    value.every((d) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6)
  );
}
