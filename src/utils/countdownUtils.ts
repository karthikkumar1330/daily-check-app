import type { Countdown } from "../types";
import {
  addDays,
  daysBetweenCalendarDates,
  getCalendarComponents,
  todayStr
} from "./dateUtils";

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
  displayValue: string;
  displayUnit: string;
  badgeText: string;
  headlineText: string;
  progressPct: number;
  hasMeaningfulProgress: boolean;
  nextMilestone: MilestoneInfo | null;
  milestones: MilestoneInfo[];
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
  if (days === 1) return "1 day";
  return `${days} days`;
}

/**
 * Contextual smart target date display:
 * - Today -> "Today"
 * - Tomorrow -> "Tomorrow · 1 October"
 * - Same year -> "21 Oct 2026"
 * - Different year / Far future -> "21 October 2026"
 * - Completed -> "21 September 2026 · Completed"
 */
export function formatSmartTargetDate(targetDate: string, referenceDate: string = todayStr()): string {
  if (targetDate === referenceDate) return "Today";
  
  const comp = getCalendarComponents(targetDate);
  const refComp = getCalendarComponents(referenceDate);

  if (targetDate === addDays(referenceDate, 1)) {
    return `Tomorrow · ${comp.day} ${comp.monthName}`;
  }

  if (targetDate < referenceDate) {
    return `${comp.day} ${comp.monthName} ${comp.year} · Completed`;
  }

  if (comp.year === refComp.year) {
    return `${comp.day} ${comp.monthShort} ${comp.year}`;
  }

  return `${comp.day} ${comp.monthName} ${comp.year}`;
}

/**
 * Standard full date display format: "21 October 2026"
 */
export function formatFullTargetDate(dateStr: string): string {
  const comp = getCalendarComponents(dateStr);
  return `${comp.day} ${comp.monthName} ${comp.year}`;
}

/**
 * Standard weekday format: "Wednesday"
 */
export function formatTargetWeekday(dateStr: string): string {
  const comp = getCalendarComponents(dateStr);
  return comp.weekday;
}

const STANDARD_MILESTONES = [1000, 500, 365, 200, 100, 50, 30, 21, 14, 7, 3, 1, 0];

/**
 * Calculates countdown status, remaining calendar days, milestones and progress safely.
 * Never returns negative countdown values or negative days.
 * Pure calendar calculations: zero timezone leakage.
 */
export function computeCountdownStatus(
  item: Countdown,
  referenceDate: string = todayStr()
): CountdownStatus {
  const diff = daysBetweenCalendarDates(referenceDate, item.targetDate);

  // Phase
  let phase: CountdownPhase = "upcoming";
  if (diff === 0) {
    phase = "today";
  } else if (diff < 0) {
    phase = "completed";
  } else {
    phase = "upcoming";
  }

  // Display value and unit formatting according to strict rules:
  // > 30 days: 164 DAYS LEFT
  // 8-30 days: 24 DAYS LEFT
  // 2-7 days: 6 DAYS LEFT
  // 1 day: 1 DAY LEFT (singular DAY)
  // same date: TODAY
  // target date passed: COMPLETED
  let displayValue = "";
  let displayUnit = "";
  let badgeText = "";
  let headlineText = "";

  if (diff < 0) {
    displayValue = "COMPLETED";
    displayUnit = "";
    badgeText = "Completed";
    headlineText = "Completed";
  } else if (diff === 0) {
    displayValue = "TODAY";
    displayUnit = "";
    badgeText = "Today";
    headlineText = "Today";
  } else if (diff === 1) {
    displayValue = "1";
    displayUnit = "DAY LEFT";
    badgeText = "1d left";
    headlineText = "1 day left";
  } else {
    displayValue = String(diff);
    displayUnit = "DAYS LEFT";
    badgeText = `${diff}d left`;
    headlineText = `${diff} days left`;
  }

  // Meaningful progress percentage calculation
  let progressPct = 0;
  let hasMeaningfulProgress = false;
  const createdDateStr = item.createdAt ? item.createdAt.slice(0, 10) : referenceDate;
  const totalDays = daysBetweenCalendarDates(createdDateStr, item.targetDate);
  const elapsed = daysBetweenCalendarDates(createdDateStr, referenceDate);

  if (diff <= 0) {
    progressPct = 100;
    hasMeaningfulProgress = true;
  } else if (totalDays > 0 && elapsed > 0) {
    progressPct = Math.min(99, Math.max(1, Math.round((elapsed / totalDays) * 100)));
    // Only meaningful when progress is > 0 and < 100
    hasMeaningfulProgress = progressPct > 0 && progressPct < 100;
  }

  // Milestones: Next milestone must NOT be repeated in upcoming list
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
    displayValue,
    displayUnit,
    badgeText,
    headlineText,
    progressPct,
    hasMeaningfulProgress,
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
