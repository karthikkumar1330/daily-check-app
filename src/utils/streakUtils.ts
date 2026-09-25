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
 * A day qualifies when total > 0 and completion >= 80%.
 * A day with 0 tasks:
 *  - does not increase streak
 *  - does not break streak
 *  - does not become 0% or 100%
 *
 * Current streak:
 *  - Scans backward starting from today.
 *  - If today has total > 0 and pct >= 80, today counts and extends the streak.
 *  - If today has 0 tasks, or today is in-progress (< 80%), today does not increment,
 *    and does not break yesterday's streak (the day is not over yet).
 *  - For past days (before today):
 *    - 0-task days are neutral (skipped, neither extend nor break).
 *    - days with tasks: >= 80% extends the streak, < 80% breaks the streak.
 *
 * Best streak:
 *  - Scans chronologically from the earliest active date up to today.
 *  - 0-task days are neutral (skipped).
 *  - >= 80% extends the running streak.
 *  - < 80% breaks the running streak (except today if still in-progress).
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
  const today = todayStr();

  // Current streak: walk backward from today.
  let current = 0;
  let cursor = today;
  let guard = 0;

  // Check today first
  const todayStats = getStats(today);
  if (todayStats.total > 0 && todayStats.pct !== null && todayStats.pct >= STREAK_THRESHOLD) {
    current++;
  }
  // Move to yesterday to continue walking backward
  cursor = addDays(today, -1);

  while (cursor >= minDate && guard < 20000) {
    const st = getStats(cursor);
    if (st.total > 0) {
      if (st.pct !== null && st.pct >= STREAK_THRESHOLD) {
        current++;
        cursor = addDays(cursor, -1);
      } else {
        // Less than 80% on a past day with tasks -> breaks the streak!
        break;
      }
    } else {
      // 0-task day: neutral, does not increase or break streak
      cursor = addDays(cursor, -1);
    }
    guard++;
  }

  // Best streak: scan chronologically from minDate up to today
  let best = 0;
  let running = 0;
  let cur = minDate;
  guard = 0;

  while (cur <= today && guard < 20000) {
    const st = getStats(cur);
    if (st.total > 0) {
      if (st.pct !== null && st.pct >= STREAK_THRESHOLD) {
        running++;
        if (running > best) best = running;
      } else {
        // Past day failed to qualify -> reset running streak
        if (cur < today) {
          running = 0;
        }
      }
    }
    // 0-task day: neutral (running unchanged)
    cur = addDays(cur, 1);
    guard++;
  }

  if (current > best) best = current;
  return { current, best };
}
