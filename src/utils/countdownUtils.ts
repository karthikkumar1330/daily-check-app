import type { CountdownGoal } from "../types";
import { daysBetweenCalendar } from "./dateUtils";

export type CountdownPhase = "upcoming" | "active" | "complete";

export interface CountdownStatus {
  phase: CountdownPhase;
  /** Days from today until the goal starts. Only meaningful when phase === "upcoming". */
  daysUntilStart: number;
  /**
   * Challenge days remaining, INCLUSIVE of today. Start date = day 1, so on
   * the start date this equals the full challenge length; on the target
   * date itself it is always 1, never 0 — the target date is still a
   * counted day of the challenge, not the moment it ends.
   */
  daysLeft: number;
  /** Whole challenge days fully completed before today (0 on the start date). */
  elapsedDays: number;
  /** Total challenge days, inclusive of both the start and target dates. */
  totalDays: number;
  /** Today's 1-indexed position in the challenge (day 1 = start date). */
  dayNumber: number;
  /** 0-100, how far through the challenge "today" is (day 1 of N -> ~1/N). */
  progressPct: number;
}

/**
 * Calendar-day-only status for a goal, evaluated against a given "today"
 * (YYYY-MM-DD). Deliberately takes no clock/timestamp input - recalculate
 * by calling this again, never by decrementing a stored number.
 *
 * Counting is inclusive: the start date is challenge day 1, and daysLeft
 * always includes today itself (so the target date reads "1 day", not "0").
 */
export function computeCountdownStatus(goal: CountdownGoal, today: string): CountdownStatus {
  // Inclusive span length: start and target both count as challenge days.
  const totalDays = Math.max(1, daysBetweenCalendar(goal.startDate, goal.targetDate) + 1);

  if (today < goal.startDate) {
    const daysUntilStart = daysBetweenCalendar(today, goal.startDate);
    return {
      phase: "upcoming",
      daysUntilStart,
      daysLeft: totalDays,
      elapsedDays: 0,
      totalDays,
      dayNumber: 0,
      progressPct: 0
    };
  }

  if (today > goal.targetDate) {
    return {
      phase: "complete",
      daysUntilStart: 0,
      daysLeft: 0,
      elapsedDays: totalDays,
      totalDays,
      dayNumber: totalDays,
      progressPct: 100
    };
  }

  const dayNumber = Math.min(totalDays, Math.max(1, daysBetweenCalendar(goal.startDate, today) + 1));
  const daysLeft = totalDays - dayNumber + 1; // inclusive: 1 on the target date, never 0
  const elapsedDays = dayNumber - 1;
  const progressPct = Math.round((dayNumber / totalDays) * 100);

  return { phase: "active", daysUntilStart: 0, daysLeft, elapsedDays, totalDays, dayNumber, progressPct };
}

export function isValidGoalDateRange(startDate: string, targetDate: string): boolean {
  return targetDate >= startDate;
}
