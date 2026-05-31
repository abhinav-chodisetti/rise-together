// Shared streak primitives. Used by habits and challenges — both walk a
// schedule of weekdays backward from today, skipping rest days without
// breaking the streak, and stopping at the first scheduled-but-missed day.

import type { Weekday } from './weekdays';

export function toISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

// Parse a "YYYY-MM-DD" string into a local-time Date.
// `new Date(isoString)` parses as UTC midnight and drifts the day for any
// user not in UTC+0 — breaking streak math.
export function localDateFromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const STREAK_SAFETY_CAP = 400;

// Consecutive scheduled days completed, walking backward from `today`. Rest
// days (weekdays not in `daysOfWeek`) are skipped and don't break the streak.
// A scheduled-and-missed day breaks it. Today gets grace: if today is
// scheduled but not yet done, start at yesterday so the day isn't over.
export function computeScheduledStreak(
  completedDates: string[],
  today: string,
  daysOfWeek: Weekday[],
): number {
  if (daysOfWeek.length === 0) return 0;
  const scheduledSet = new Set<number>(daysOfWeek);
  const dateSet = new Set(completedDates);
  const cursor = localDateFromISO(today);

  const todayIsScheduled = scheduledSet.has(cursor.getDay());
  if (todayIsScheduled && !dateSet.has(toISO(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  for (let i = 0; i < STREAK_SAFETY_CAP; i++) {
    if (!scheduledSet.has(cursor.getDay())) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (!dateSet.has(toISO(cursor))) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
