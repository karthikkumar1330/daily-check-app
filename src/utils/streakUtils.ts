import type { DayData, Task } from "../types";
import { addDays, todayStr } from "./dateUtils";
import { dayStats } from "./progressUtils";
import { resolveDayData } from "./recurrenceUtils";

const STREAK_THRESHOLD = 80;

export interface Streaks {
  current: number;
  best: number;
}

/**
 * A day only counts toward a streak when it has at least one task:
 *  - total > 0 and pct >= 80  -> extends the streak
 *  - total > 0 and pct < 80   -> breaks the streak
 *  - total === 0              -> ignored entirely (neither extends nor breaks)
 */
export function computeStreaks(days: Record<string, DayData>, recurringTasks: Task[] = []): Streaks {
  function getStats(date: string) {
    const d = recurringTasks.length > 0 ? resolveDayData(date, days[date], recurringTasks) : days[date];
    return dayStats(d);
  }

  const candidateDates = Object.keys(days).filter((d) => dayStats(days[d]).total > 0);
  recurringTasks.forEach((t) => {
    if (t.recurrence?.startDate) {
      candidateDates.push(t.recurrence.startDate);
    }
  });

  const activeDates = candidateDates.sort();
  if (activeDates.length === 0) return { current: 0, best: 0 };

  const minDate = activeDates[0];
  const maxDate = todayStr();

  // Current streak: walk backward from today, skipping zero-task days.
  let current = 0;
  let cursor = todayStr();
  let guard = 0;
  while (cursor >= minDate && guard < 20000) {
    const st = getStats(cursor);
    if (st.total > 0) {
      if (st.pct !== null && st.pct >= STREAK_THRESHOLD) {
        current++;
        cursor = addDays(cursor, -1);
      } else {
        break;
      }
    } else {
      cursor = addDays(cursor, -1);
    }
    guard++;
  }

  // Best streak: scan chronologically; zero-task days are simply skipped.
  let best = 0;
  let running = 0;
  let cur = minDate;
  guard = 0;
  while (cur <= maxDate && guard < 20000) {
    const st = getStats(cur);
    if (st.total > 0) {
      if (st.pct !== null && st.pct >= STREAK_THRESHOLD) {
        running++;
        if (running > best) best = running;
      } else {
        running = 0;
      }
    }
    cur = addDays(cur, 1);
    guard++;
  }

  if (current > best) best = current;
  return { current, best };
}
