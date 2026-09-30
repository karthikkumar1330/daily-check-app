import type { Countdown, CountdownDisplayMode, CountdownMode } from "../types";
import { addDays, daysBetweenCalendar, parseDateStr, toDateStr, todayStr } from "./dateUtils";

export type CountdownPhase = "upcoming" | "today" | "completed";

export interface MilestoneInfo {
  days: number;
  label: string;
  isReached: boolean;
  isNext: boolean;
}

export interface CountdownStatus {
  phase: CountdownPhase;
  daysLeft: number; // >= 0
  rawDaysDiff: number; // targetDate - referenceDate
  workingDaysLeft: number;
  displayValue: string;
  displayUnit: string;
  badgeText: string;
  headlineText: string;
  progressPct: number;
  nextMilestone: MilestoneInfo | null;
  milestones: MilestoneInfo[];
}

/**
 * Counts working days (Monday-Friday) between two dates.
 * If targetDate is after fromDate: counts each day from fromDate to targetDate that is Mon-Fri.
 */
export function calculateWorkingDays(fromDateStr: string, targetDateStr: string): number {
  if (fromDateStr === targetDateStr) return 0;
  const isForward = targetDateStr > fromDateStr;
  const start = parseDateStr(isForward ? fromDateStr : targetDateStr);
  const end = parseDateStr(isForward ? targetDateStr : fromDateStr);

  let workingDays = 0;
  const cur = new Date(start.getTime());

  // Count days
  while (cur < end) {
    cur.setDate(cur.getDate() + 1);
    const dayOfWeek = cur.getDay(); // 0 is Sun, 6 is Sat
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
  }

  return isForward ? workingDays : -workingDays;
}

/**
 * Presentation helper to format singular vs plural days (e.g. 1 day vs 2 days)
 */
export function formatDays(count: number): string {
  return count === 1 ? "1 day" : `${count} days`;
}

/**
 * Presentation helper to format milestone label
 */
export function formatMilestoneDays(days: number): string {
  if (days === 0) return "Target day";
  return formatDays(days);
}

/**
 * Contextual smart target date display:
 * - Today -> "Today"
 * - Tomorrow -> "Tomorrow"
 * - Same year -> "24 October"
 * - Different year -> "31 March 2027"
 */
export function formatSmartTargetDate(targetDate: string, referenceDate: string = todayStr()): string {
  if (targetDate === referenceDate) return "Today";
  if (targetDate === addDays(referenceDate, 1)) return "Tomorrow";

  const target = parseDateStr(targetDate);
  const ref = parseDateStr(referenceDate);

  if (target.getFullYear() === ref.getFullYear()) {
    return target.toLocaleDateString("en-US", { day: "numeric", month: "long" });
  }

  return target.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Standard full date display format: "31 December 2026"
 */
export function formatFullTargetDate(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

const STANDARD_MILESTONES = [1000, 500, 365, 200, 100, 50, 30, 21, 14, 7, 3, 1, 0];

/**
 * Calculates countdown status, remaining values, milestones and progress safely.
 * Never returns negative countdown values.
 */
export function computeCountdownStatus(
  item: Countdown,
  referenceDate: string = todayStr()
): CountdownStatus {
  const diff = daysBetweenCalendar(referenceDate, item.targetDate);
  const workingDays = item.countWorkingDays
    ? Math.max(0, calculateWorkingDays(referenceDate, item.targetDate))
    : Math.max(0, diff);

  const effectiveDays = item.countWorkingDays ? workingDays : Math.max(0, diff);

  // Phase
  let phase: CountdownPhase = "upcoming";
  if (diff === 0) {
    phase = "today";
  } else if (diff < 0) {
    phase = "completed";
  } else {
    phase = "upcoming";
  }

  // Display value and unit formatting
  let displayValue = "";
  let displayUnit = "";
  let badgeText = "";
  let headlineText = "";

  if (item.mode === "countup") {
    // Count up from target date
    const elapsedDays = Math.max(0, -diff);
    if (diff === 0) {
      displayValue = "TODAY";
      displayUnit = "";
      badgeText = "Today";
      headlineText = "Today";
    } else if (diff < 0) {
      displayValue = String(elapsedDays);
      displayUnit = elapsedDays === 1 ? "DAY AGO" : "DAYS AGO";
      badgeText = `${elapsedDays}d ago`;
      headlineText = `${elapsedDays} ${elapsedDays === 1 ? "day" : "days"} ago`;
    } else {
      displayValue = String(diff);
      displayUnit = diff === 1 ? "DAY UNTIL START" : "DAYS UNTIL START";
      badgeText = `Starts in ${diff}d`;
      headlineText = `Starts in ${diff} ${diff === 1 ? "day" : "days"}`;
    }
  } else {
    // Standard Countdown mode
    if (diff === 0) {
      displayValue = "TODAY";
      displayUnit = "";
      badgeText = "Today";
      headlineText = "Today";
    } else if (diff === 1 && !item.countWorkingDays) {
      displayValue = "1";
      displayUnit = "DAY LEFT";
      badgeText = "Tomorrow";
      headlineText = "1 day left";
    } else if (diff > 0) {
      if (item.displayMode === "weeksDays") {
        const weeks = Math.floor(effectiveDays / 7);
        const remDays = effectiveDays % 7;
        displayValue = `${weeks}w ${remDays}d`;
        displayUnit = item.countWorkingDays ? "WORK DAYS LEFT" : "LEFT";
        badgeText = `${weeks}w ${remDays}d left`;
        headlineText = `${weeks} weeks, ${remDays} days left`;
      } else if (item.displayMode === "hours") {
        const totalHours = effectiveDays * 24;
        displayValue = totalHours.toLocaleString();
        displayUnit = "HOURS LEFT";
        badgeText = `${totalHours}h left`;
        headlineText = `${totalHours.toLocaleString()} hours left`;
      } else {
        displayValue = String(effectiveDays);
        displayUnit = item.countWorkingDays
          ? effectiveDays === 1
            ? "WORK DAY LEFT"
            : "WORK DAYS LEFT"
          : effectiveDays === 1
          ? "DAY LEFT"
          : "DAYS LEFT";
        badgeText = `${effectiveDays}d left`;
        headlineText = `${effectiveDays} ${effectiveDays === 1 ? "day" : "days"} left`;
      }
    } else {
      // Completed / past
      const pastDays = Math.abs(diff);
      displayValue = String(pastDays);
      displayUnit = pastDays === 1 ? "DAY AGO" : "DAYS AGO";
      badgeText = `${pastDays}d ago`;
      headlineText = `Completed ${pastDays} ${pastDays === 1 ? "day" : "days"} ago`;
    }
  }

  // Progress percentage calculation
  let progressPct = 0;
  const createdDateStr = item.createdAt ? toDateStr(new Date(item.createdAt)) : referenceDate;
  const totalDays = Math.max(1, daysBetweenCalendar(createdDateStr, item.targetDate));
  const elapsed = Math.max(0, daysBetweenCalendar(createdDateStr, referenceDate));

  if (diff <= 0) {
    progressPct = 100;
  } else {
    progressPct = Math.min(99, Math.max(0, Math.round((elapsed / totalDays) * 100)));
  }

  // Milestones
  const relevantMilestones = STANDARD_MILESTONES.filter((m) => m <= totalDays || m <= diff);
  if (!relevantMilestones.includes(0)) relevantMilestones.push(0);
  relevantMilestones.sort((a, b) => b - a);

  let nextMilestoneDays: number | null = null;
  if (diff > 0) {
    for (const m of relevantMilestones) {
      if (m < diff) {
        nextMilestoneDays = m;
        break;
      }
    }
  }

  const milestones: MilestoneInfo[] = relevantMilestones.map((m) => {
    const isReached = diff <= m;
    const isNext = nextMilestoneDays === m;
    return {
      days: m,
      label: formatMilestoneDays(m),
      isReached,
      isNext
    };
  });

  const nextMilestone = milestones.find((m) => m.isNext) || null;

  return {
    phase,
    daysLeft: Math.max(0, diff),
    rawDaysDiff: diff,
    workingDaysLeft: Math.max(0, workingDays),
    displayValue,
    displayUnit,
    badgeText,
    headlineText,
    progressPct,
    nextMilestone,
    milestones
  };
}

/**
 * Common quick templates for Countdown creation.
 */
export interface CountdownTemplate {
  key: string;
  name: string;
  icon: string;
  defaultAllDay: boolean;
  defaultWorkingDays: boolean;
}

export const COUNTDOWN_TEMPLATES: CountdownTemplate[] = [
  { key: "exam", name: "Exam", icon: "📚", defaultAllDay: true, defaultWorkingDays: false },
  { key: "trip", name: "Trip", icon: "✈️", defaultAllDay: true, defaultWorkingDays: false },
  { key: "birthday", name: "Birthday", icon: "🎂", defaultAllDay: true, defaultWorkingDays: false },
  { key: "deadline", name: "Deadline", icon: "⏳", defaultAllDay: false, defaultWorkingDays: true },
  { key: "fitness", name: "Fitness", icon: "🏃", defaultAllDay: true, defaultWorkingDays: false },
  { key: "goal", name: "Goal", icon: "🎯", defaultAllDay: true, defaultWorkingDays: false },
  { key: "anniversary", name: "Anniversary", icon: "💍", defaultAllDay: true, defaultWorkingDays: false },
  { key: "custom", name: "Custom", icon: "✨", defaultAllDay: true, defaultWorkingDays: false }
];
