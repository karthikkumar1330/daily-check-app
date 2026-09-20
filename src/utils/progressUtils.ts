import type { DayData, DayStats, Task } from "../types";
import { weekdayFull } from "./dateUtils";
import { resolveDayData } from "./recurrenceUtils";

/**
 * Zero-task rule: a day with no tasks has pct = null. Callers must never
 * treat null as 0% or 100% — it means "no tasks", not "no progress" or
 * "fully done".
 */
export function dayStats(day: DayData | undefined): DayStats {
  const tasks = day?.tasks ?? [];
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pct = total === 0 ? null : Math.round((completed / total) * 100);
  return { total, completed, remaining: total - completed, pct };
}

export function formatPct(pct: number | null): string {
  return pct === null ? "\u2013" : pct + "%";
}

export function motivationalMsg(stats: DayStats): string {
  if (stats.total === 0) return "Nothing planned yet.";
  const pct = stats.pct as number;
  if (pct >= 100) return "Perfect day! \uD83C\uDF89";
  if (pct >= 80) return "Excellent work! \uD83D\uDCAA";
  if (pct >= 60) return "Good progress. Keep going.";
  if (pct >= 40) return "Keep moving forward.";
  return "Every completed task counts.";
}

export interface WeekSummary {
  /** null when no day in the week has any tasks. */
  avgPct: number | null;
  completed: number;
  created: number;
  bestDay: string | null;
}

/**
 * Weekly average only counts days that have at least one task. A day with
 * zero tasks contributes to neither the average nor "best day", and can
 * never itself be the best day.
 */
export function weekSummary(
  days: Record<string, DayData>,
  weekDates: string[],
  recurringTasks?: Task[]
): WeekSummary {
  let totalPct = 0;
  let countedDays = 0;
  let completed = 0;
  let created = 0;
  let bestDay: string | null = null;
  let bestPct = -1;
  let bestCompleted = -1;

  weekDates.forEach((dstr) => {
    const day = recurringTasks ? resolveDayData(dstr, days[dstr], recurringTasks) : days[dstr];
    const st = dayStats(day);
    completed += st.completed;
    created += st.total;
    if (st.total === 0 || st.pct === null) return; // zero-task day: excluded entirely

    totalPct += st.pct;
    countedDays++;

    if (st.pct > 0) {
      const better = st.pct > bestPct || (st.pct === bestPct && st.completed > bestCompleted);
      if (better) {
        bestPct = st.pct;
        bestCompleted = st.completed;
        bestDay = weekdayFull(dstr);
      }
    }
  });

  return {
    avgPct: countedDays ? Math.round(totalPct / countedDays) : null,
    completed,
    created,
    bestDay
  };
}
