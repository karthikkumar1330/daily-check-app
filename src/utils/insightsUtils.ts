import type {
  AppData,
  CategoryId,
  CountdownGoal,
  CountdownGoalsData,
  DayData,
  Priority,
  Task
} from "../types";
import {
  addDays,
  daysBetweenCalendar,
  formatDateMedium,
  getWeekDates,
  getWeekStart,
  isValidDateStr,
  monthAnchor,
  parseDateStr,
  toDateStr,
  todayStr,
  weekdayFull
} from "./dateUtils";
import { dayStats } from "./progressUtils";
import { isTaskScheduledOnDate, resolveDayData } from "./recurrenceUtils";
import { computeStreaks } from "./streakUtils";

/* ==========================================================================
   1. TYPES & INTERFACES
   ========================================================================== */

export type DateRangePreset =
  | "current_week"
  | "previous_week"
  | "last_7_days"
  | "last_30_days"
  | "current_month"
  | "previous_month";

export interface DateRange {
  preset?: DateRangePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  dates: string[];
  label: string;
}

export interface DailyInsightMetrics {
  date: string;
  total: number;
  completed: number;
  remaining: number;
  /** null if total === 0, otherwise (completed / total) * 100 */
  pct: number | null;
  tasks: Task[];
}

export interface DayInsightReference {
  date: string;
  dayName: string;
  pct: number;
  completed: number;
  total: number;
}

export interface PeriodInsightMetrics {
  startDate: string;
  endDate: string;
  totalTasks: number;
  completedTasks: number;
  remainingTasks: number;
  /** Overall task completion: (completedTasks / totalTasks) * 100, or null if totalTasks === 0 */
  completionPct: number | null;
  /** Count of days in period with total > 0 */
  activeDays: number;
  /** Count of active days with pct >= 80 */
  highConsistencyDays: number;
  /** Mean of daily percentages across active days, or null if activeDays === 0 */
  averageCompletion: number | null;
  /** Day with highest completion % (tie-broken by completed tasks). null if all active days 0% or no active days */
  bestDay: DayInsightReference | null;
  /** Active day with lowest completion %. null if no active days */
  lowestActiveDay: DayInsightReference | null;
  /** Current streak across entire history */
  currentStreak: number;
  /** Best streak across entire history */
  bestStreak: number;
  /** Daily breakdown for all calendar dates in the period */
  dailyMetrics: DailyInsightMetrics[];
}

export interface WeekComparison {
  currentPct: number | null;
  previousPct: number | null;
  difference: number | null;
  hasPreviousActivity: boolean;
}

export interface ScheduleInsight {
  scheduledTasks: number;
  completedScheduledTasks: number;
  overdueTasks: number;
  reminderEnabledTasks: number;
  onTimeCompletions: number;
  indeterminateScheduledTasks: number;
}

export interface RecurringTaskInsight {
  id: string;
  title: string;
  category: CategoryId;
  priority: Priority;
  scheduledCount: number;
  completedCount: number;
  completionPct: number | null;
}

export interface CategoryInsight {
  category: CategoryId;
  label: string;
  total: number;
  completed: number;
  completionPct: number | null;
}

export interface PriorityBreakdown {
  priority: Priority;
  label: string;
  total: number;
  completed: number;
  completionPct: number | null;
}

export interface PriorityInsight {
  high: PriorityBreakdown;
  medium: PriorityBreakdown;
  low: PriorityBreakdown;
  highPriorityCompletionPct: number | null;
}

export interface GoalInsight {
  id: string;
  title: string;
  startDate: string;
  targetDate: string;
  icon: string;
  status: "upcoming" | "active" | "completed";
  daysTotal: number;
  daysRemaining: number;
  progressPct: number;
}

export type InsightType =
  | "best_day"
  | "consistency"
  | "priority"
  | "recurring"
  | "schedule"
  | "comparison"
  | "volume";

export interface GeneratedInsight {
  id: string;
  type: InsightType;
  message: string;
}

/* ==========================================================================
   2. DATE RANGE UTILITIES
   ========================================================================== */

/**
 * Returns an inclusive list of YYYY-MM-DD date strings between start and end.
 * Pure and timezone-safe using parseDateStr.
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  if (!isValidDateStr(startDate) || !isValidDateStr(endDate)) return [];
  if (startDate > endDate) return [];

  const dates: string[] = [];
  let cursor = startDate;
  let guard = 0;
  while (cursor <= endDate && guard < 5000) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
    guard++;
  }
  return dates;
}

/**
 * Generates date ranges and localized labels for common preset windows.
 */
export function getDateRangePreset(preset: DateRangePreset, anchorDate = todayStr()): DateRange {
  switch (preset) {
    case "current_week": {
      const start = getWeekStart(anchorDate);
      const dates = getWeekDates(start);
      return {
        preset,
        startDate: dates[0],
        endDate: dates[6],
        dates,
        label: "Current Week"
      };
    }
    case "previous_week": {
      const currentStart = getWeekStart(anchorDate);
      const prevStart = addDays(currentStart, -7);
      const dates = getWeekDates(prevStart);
      return {
        preset,
        startDate: dates[0],
        endDate: dates[6],
        dates,
        label: "Previous Week"
      };
    }
    case "last_7_days": {
      const start = addDays(anchorDate, -6);
      const dates = getDateRange(start, anchorDate);
      return {
        preset,
        startDate: start,
        endDate: anchorDate,
        dates,
        label: "Last 7 Days"
      };
    }
    case "last_30_days": {
      const start = addDays(anchorDate, -29);
      const dates = getDateRange(start, anchorDate);
      return {
        preset,
        startDate: start,
        endDate: anchorDate,
        dates,
        label: "Last 30 Days"
      };
    }
    case "current_month": {
      const anchor = monthAnchor(anchorDate);
      const d = parseDateStr(anchor);
      // Last day of month
      const lastDate = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const end = toDateStr(new Date(d.getFullYear(), d.getMonth(), lastDate));
      const dates = getDateRange(anchor, end);
      return {
        preset,
        startDate: anchor,
        endDate: end,
        dates,
        label: "Current Month"
      };
    }
    case "previous_month": {
      const anchor = monthAnchor(anchorDate);
      const d = parseDateStr(anchor);
      const prevMonthDate = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const start = toDateStr(prevMonthDate);
      const lastDate = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate();
      const end = toDateStr(new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), lastDate));
      const dates = getDateRange(start, end);
      return {
        preset,
        startDate: start,
        endDate: end,
        dates,
        label: "Previous Month"
      };
    }
  }
}

/* ==========================================================================
   3. DAILY METRICS RESOLVER
   ========================================================================== */

/**
 * Resolves occurrences and calculates metrics for a single calendar date.
 * Respects the Zero-Task Rule: if total === 0, pct = null.
 */
export function getDailyMetrics(
  dateStr: string,
  rawDayData: DayData | undefined,
  recurringTasks: Task[] = []
): DailyInsightMetrics {
  const resolved = resolveDayData(dateStr, rawDayData, recurringTasks);
  const tasks = resolved.tasks ?? [];
  const st = dayStats(resolved);

  return {
    date: dateStr,
    total: st.total,
    completed: st.completed,
    remaining: st.remaining,
    pct: st.pct,
    tasks
  };
}

/* ==========================================================================
   4. PERIOD METRICS CALCULATION
   ========================================================================== */

/**
 * Computes comprehensive period metrics across a date range.
 * Zero-task days are strictly excluded from averages, Best Day, and Lowest Active Day.
 */
export function calculatePeriodMetrics(
  appData: AppData,
  startDate: string,
  endDate: string
): PeriodInsightMetrics {
  const dates = getDateRange(startDate, endDate);
  const recurringTasks = appData.recurringTasks ?? [];
  const days = appData.days ?? {};

  let totalTasks = 0;
  let completedTasks = 0;
  let activeDays = 0;
  let highConsistencyDays = 0;
  let sumDailyPct = 0;

  let bestDayRef: DayInsightReference | null = null;
  let bestPct = -1;
  let bestCompleted = -1;

  let lowestDayRef: DayInsightReference | null = null;
  let lowestPct = 101;
  let lowestCompleted = Infinity;

  const dailyMetrics: DailyInsightMetrics[] = [];

  for (const dateStr of dates) {
    const daily = getDailyMetrics(dateStr, days[dateStr], recurringTasks);
    dailyMetrics.push(daily);

    totalTasks += daily.total;
    completedTasks += daily.completed;

    // Zero-task days are excluded from all active metrics
    if (daily.total > 0 && daily.pct !== null) {
      activeDays++;
      sumDailyPct += daily.pct;

      if (daily.pct >= 80) {
        highConsistencyDays++;
      }

      // Best Day rule: Must be an active day with pct > 0
      if (daily.pct > 0) {
        const isBetter =
          daily.pct > bestPct || (daily.pct === bestPct && daily.completed > bestCompleted);
        if (isBetter) {
          bestPct = daily.pct;
          bestCompleted = daily.completed;
          bestDayRef = {
            date: dateStr,
            dayName: weekdayFull(dateStr),
            pct: daily.pct,
            completed: daily.completed,
            total: daily.total
          };
        }
      }

      // Lowest Active Day rule
      const isLower =
        daily.pct < lowestPct || (daily.pct === lowestPct && daily.completed < lowestCompleted);
      if (isLower) {
        lowestPct = daily.pct;
        lowestCompleted = daily.completed;
        lowestDayRef = {
          date: dateStr,
          dayName: weekdayFull(dateStr),
          pct: daily.pct,
          completed: daily.completed,
          total: daily.total
        };
      }
    }
  }

  const remainingTasks = Math.max(0, totalTasks - completedTasks);
  const completionPct = totalTasks === 0 ? null : (completedTasks / totalTasks) * 100;
  const averageCompletion = activeDays === 0 ? null : sumDailyPct / activeDays;

  // Streaks use global history from appData
  const streaks = computeStreaks(days, recurringTasks);

  return {
    startDate,
    endDate,
    totalTasks,
    completedTasks,
    remainingTasks,
    completionPct,
    activeDays,
    highConsistencyDays,
    averageCompletion,
    bestDay: bestDayRef,
    lowestActiveDay: lowestDayRef,
    currentStreak: streaks.current,
    bestStreak: streaks.best,
    dailyMetrics
  };
}

/* ==========================================================================
   5. WEEK-OVER-WEEK COMPARISON
   ========================================================================== */

/**
 * Compares two period metrics neutrally without value judgments.
 */
export function calculateWeekOverWeek(
  currentPeriod: PeriodInsightMetrics,
  previousPeriod: PeriodInsightMetrics
): WeekComparison {
  const currentPct = currentPeriod.averageCompletion;
  const previousPct = previousPeriod.averageCompletion;

  if (previousPeriod.activeDays === 0 || previousPct === null) {
    return {
      currentPct,
      previousPct: null,
      difference: null,
      hasPreviousActivity: false
    };
  }

  const difference = currentPct !== null ? currentPct - previousPct : null;

  return {
    currentPct,
    previousPct,
    difference,
    hasPreviousActivity: true
  };
}

/* ==========================================================================
   6. SCHEDULE ANALYTICS
   ========================================================================== */

/**
 * Analyzes schedule adherence and reminders safely.
 * Tasks with only dueDate and no dueTime have indeterminate on-time status.
 */
export function calculateScheduleMetrics(
  dailyMetricsList: DailyInsightMetrics[],
  anchorTimestamp = Date.now(),
  currentDateStr = todayStr()
): ScheduleInsight {
  let scheduledTasks = 0;
  let completedScheduledTasks = 0;
  let overdueTasks = 0;
  let reminderEnabledTasks = 0;
  let onTimeCompletions = 0;
  let indeterminateScheduledTasks = 0;

  for (const day of dailyMetricsList) {
    for (const task of day.tasks) {
      const hasDueDate = Boolean(task.dueDate);
      const hasDueTime = Boolean(task.dueTime);
      const isScheduled = hasDueDate || hasDueTime;

      if (task.reminderMinutes !== null && task.reminderMinutes !== undefined) {
        reminderEnabledTasks++;
      }

      if (!isScheduled) continue;

      scheduledTasks++;

      if (task.completed) {
        completedScheduledTasks++;

        // On-time status can ONLY be determined if a dueTime exists
        if (hasDueTime && task.dueTime) {
          const [hStr, mStr] = task.dueTime.split(":");
          const hours = parseInt(hStr, 10) || 0;
          const minutes = parseInt(mStr, 10) || 0;
          const scheduledDate = parseDateStr(day.date);
          scheduledDate.setHours(hours, minutes, 0, 0);
          const scheduledMs = scheduledDate.getTime();

          if (task.completedAt !== null && task.completedAt <= scheduledMs) {
            onTimeCompletions++;
          }
        } else {
          indeterminateScheduledTasks++;
        }
      } else {
        // Not completed: check if overdue
        if (hasDueTime && task.dueTime) {
          const [hStr, mStr] = task.dueTime.split(":");
          const hours = parseInt(hStr, 10) || 0;
          const minutes = parseInt(mStr, 10) || 0;
          const scheduledDate = parseDateStr(day.date);
          scheduledDate.setHours(hours, minutes, 0, 0);
          if (scheduledDate.getTime() < anchorTimestamp) {
            overdueTasks++;
          }
        } else if (hasDueDate && task.dueDate && task.dueDate < currentDateStr) {
          overdueTasks++;
        }
      }
    }
  }

  return {
    scheduledTasks,
    completedScheduledTasks,
    overdueTasks,
    reminderEnabledTasks,
    onTimeCompletions,
    indeterminateScheduledTasks
  };
}

/* ==========================================================================
   7. RECURRING TASK ANALYTICS
   ========================================================================== */

/**
 * Analyzes recurring tasks strictly by occurrence dates in the period.
 * Does not mutate task completedDates or recurrence objects.
 */
export function calculateRecurringTaskMetrics(
  recurringTasks: Task[],
  dates: string[]
): RecurringTaskInsight[] {
  const results: RecurringTaskInsight[] = [];

  for (const task of recurringTasks) {
    if (!task.recurrence) continue;

    let scheduledCount = 0;
    let completedCount = 0;

    for (const dateStr of dates) {
      if (isTaskScheduledOnDate(task.recurrence, dateStr)) {
        scheduledCount++;
        if (task.completedDates && task.completedDates[dateStr]) {
          completedCount++;
        }
      }
    }

    if (scheduledCount > 0) {
      results.push({
        id: task.id,
        title: task.title,
        category: task.category,
        priority: task.priority,
        scheduledCount,
        completedCount,
        completionPct: (completedCount / scheduledCount) * 100
      });
    }
  }

  // Sort by highest scheduled volume, then title
  return results.sort((a, b) => b.scheduledCount - a.scheduledCount || a.title.localeCompare(b.title));
}

/* ==========================================================================
   8. CATEGORY ANALYTICS
   ========================================================================== */

const CATEGORY_LABELS: Record<CategoryId, string> = {
  "": "Uncategorized",
  study: "Study",
  workout: "Workout",
  health: "Health",
  work: "Work",
  personal: "Personal",
  other: "Other"
};

/**
 * Calculates task volume and completion rate grouped by category.
 */
export function calculateCategoryMetrics(
  dailyMetricsList: DailyInsightMetrics[]
): CategoryInsight[] {
  const counts: Record<CategoryId, { total: number; completed: number }> = {
    "": { total: 0, completed: 0 },
    study: { total: 0, completed: 0 },
    workout: { total: 0, completed: 0 },
    health: { total: 0, completed: 0 },
    work: { total: 0, completed: 0 },
    personal: { total: 0, completed: 0 },
    other: { total: 0, completed: 0 }
  };

  for (const day of dailyMetricsList) {
    for (const task of day.tasks) {
      const cat = (task.category in counts ? task.category : "") as CategoryId;
      counts[cat].total++;
      if (task.completed) {
        counts[cat].completed++;
      }
    }
  }

  const results: CategoryInsight[] = [];
  (Object.keys(counts) as CategoryId[]).forEach((cat) => {
    const data = counts[cat];
    if (data.total > 0) {
      results.push({
        category: cat,
        label: CATEGORY_LABELS[cat] ?? "Other",
        total: data.total,
        completed: data.completed,
        completionPct: (data.completed / data.total) * 100
      });
    }
  });

  return results.sort((a, b) => b.total - a.total);
}

/* ==========================================================================
   9. PRIORITY ANALYTICS
   ========================================================================== */

/**
 * Computes priority distributions and high-priority completion percentage.
 */
export function calculatePriorityMetrics(
  dailyMetricsList: DailyInsightMetrics[]
): PriorityInsight {
  const high = { priority: 1 as Priority, label: "High", total: 0, completed: 0, completionPct: null as number | null };
  const medium = { priority: 2 as Priority, label: "Medium", total: 0, completed: 0, completionPct: null as number | null };
  const low = { priority: 3 as Priority, label: "Low", total: 0, completed: 0, completionPct: null as number | null };

  for (const day of dailyMetricsList) {
    for (const task of day.tasks) {
      if (task.priority === 1) {
        high.total++;
        if (task.completed) high.completed++;
      } else if (task.priority === 2) {
        medium.total++;
        if (task.completed) medium.completed++;
      } else {
        low.total++;
        if (task.completed) low.completed++;
      }
    }
  }

  high.completionPct = high.total === 0 ? null : (high.completed / high.total) * 100;
  medium.completionPct = medium.total === 0 ? null : (medium.completed / medium.total) * 100;
  low.completionPct = low.total === 0 ? null : (low.completed / low.total) * 100;

  return {
    high,
    medium,
    low,
    highPriorityCompletionPct: high.completionPct
  };
}

/* ==========================================================================
   10. COUNTDOWN GOALS ANALYTICS
   ========================================================================== */

/**
 * Reads Countdown Goals and derives progress and timeline status safely.
 * Never mutates input or persistence.
 */
export function calculateGoalMetrics(
  goalsInput: CountdownGoal[] | CountdownGoalsData | null | undefined,
  referenceDate = todayStr()
): GoalInsight[] {
  if (!goalsInput) return [];

  const goals: CountdownGoal[] = Array.isArray(goalsInput)
    ? goalsInput
    : goalsInput.goals
    ? Object.values(goalsInput.goals)
    : [];

  const results: GoalInsight[] = [];

  for (const g of goals) {
    if (!isValidDateStr(g.startDate) || !isValidDateStr(g.targetDate)) continue;

    const daysTotal = Math.max(1, daysBetweenCalendar(g.startDate, g.targetDate));
    let status: "upcoming" | "active" | "completed" = "active";
    let daysRemaining = 0;
    let progressPct = 0;

    if (referenceDate < g.startDate) {
      status = "upcoming";
      daysRemaining = daysBetweenCalendar(referenceDate, g.targetDate);
      progressPct = 0;
    } else if (referenceDate > g.targetDate) {
      status = "completed";
      daysRemaining = 0;
      progressPct = 100;
    } else {
      status = "active";
      const daysElapsed = Math.max(0, daysBetweenCalendar(g.startDate, referenceDate));
      daysRemaining = Math.max(0, daysBetweenCalendar(referenceDate, g.targetDate));
      progressPct = Math.min(100, Math.max(0, Math.round((daysElapsed / daysTotal) * 100)));
    }

    results.push({
      id: g.id,
      title: g.title,
      startDate: g.startDate,
      targetDate: g.targetDate,
      icon: g.icon,
      status,
      daysTotal,
      daysRemaining,
      progressPct
    });
  }

  return results.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/* ==========================================================================
   11. DETERMINISTIC INSIGHT GENERATION
   ========================================================================== */

export interface InsightContext {
  schedule?: ScheduleInsight;
  recurring?: RecurringTaskInsight[];
  priority?: PriorityInsight;
  weekComparison?: WeekComparison;
}

/**
 * Generates up to 4 concise, deterministic, neutral observations.
 * No AI, no random text, no value judgments.
 */
export function generateInsights(
  metrics: PeriodInsightMetrics,
  context?: InsightContext
): GeneratedInsight[] {
  const insights: GeneratedInsight[] = [];

  // Rule 1: Best Day
  if (metrics.bestDay && metrics.bestDay.pct > 0) {
    insights.push({
      id: "best-day",
      type: "best_day",
      message: `${metrics.bestDay.dayName} had the highest completion rate at ${Math.round(metrics.bestDay.pct)}%.`
    });
  }

  // Rule 2: High Consistency
  if (metrics.activeDays >= 3 && metrics.highConsistencyDays > 0) {
    insights.push({
      id: "consistency",
      type: "consistency",
      message: `${metrics.highConsistencyDays} of ${metrics.activeDays} active days reached 80%+ completion.`
    });
  }

  // Rule 3: High Priority Performance
  const pri = context?.priority;
  if (pri && pri.high.total >= 3 && pri.highPriorityCompletionPct !== null) {
    insights.push({
      id: "priority",
      type: "priority",
      message: `High-priority tasks: ${pri.high.completed} of ${pri.high.total} completed (${Math.round(pri.highPriorityCompletionPct)}%).`
    });
  }

  // Rule 4: Recurring Consistency
  const rec = context?.recurring;
  if (rec && rec.length > 0) {
    const topRecurring = rec.find((r) => r.scheduledCount >= 2 && r.completionPct !== null);
    if (topRecurring && topRecurring.completionPct !== null) {
      insights.push({
        id: `recurring-${topRecurring.id}`,
        type: "recurring",
        message: `"${topRecurring.title}": ${topRecurring.completedCount} of ${topRecurring.scheduledCount} scheduled occurrences completed (${Math.round(topRecurring.completionPct)}%).`
      });
    }
  }

  // Rule 5: Scheduling Adherence
  const sch = context?.schedule;
  if (sch && sch.scheduledTasks >= 2 && sch.completedScheduledTasks > 0) {
    if (sch.onTimeCompletions > 0) {
      insights.push({
        id: "schedule-ontime",
        type: "schedule",
        message: `${sch.onTimeCompletions} of ${sch.completedScheduledTasks} completed scheduled tasks were on time.`
      });
    } else {
      insights.push({
        id: "schedule-volume",
        type: "schedule",
        message: `${sch.completedScheduledTasks} of ${sch.scheduledTasks} scheduled tasks were completed.`
      });
    }
  }

  // Rule 6: Period Comparison
  const comp = context?.weekComparison;
  if (comp && comp.hasPreviousActivity && comp.difference !== null && Math.abs(comp.difference) >= 1) {
    const diffSign = comp.difference > 0 ? "+" : "";
    insights.push({
      id: "comparison",
      type: "comparison",
      message: `Completion rate changed by ${diffSign}${Math.round(comp.difference)} percentage points compared to the previous period.`
    });
  }

  // Return at most 4 insights
  return insights.slice(0, 4);
}
