// src/lib/week.ts
import { DateTime } from 'luxon';

export function getCurrentWeekStartNY(): Date {
  const now = DateTime.now().setZone('America/New_York');
  const dow = now.weekday; // Mon=1..Sun=7
  const delta = dow >= 2 ? (dow - 2) : (7 - (2 - dow)); // last Tuesday
  return now.minus({ days: delta }).startOf('day').toJSDate();
}

export function formatWeekLabelNY(d: Date): string {
  return 'Week of ' + DateTime.fromJSDate(d).setZone('America/New_York').toFormat('LLL d, yyyy');
}
// get the next raid week (7 days after a given start)
export function getNextWeekStartFrom(start: Date): Date {
  return DateTime.fromJSDate(start)
    .setZone('America/New_York')
    .plus({ days: 7 })
    .startOf('day')
    .toJSDate();
}
