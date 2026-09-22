import type { DayData, Task } from "../types";
import { addDays, formatBestDayDate, isValidDateStr, parseDateStr, todayStr } from "./dateUtils";
import { isTaskScheduledOnDate } from "./recurrenceUtils";
import { calculateDurationPct, formatDuration } from "./durationUtils";
import { calculateQuantityPct, formatQuantity, getTaskQuantityOnDate } from "./quantityUtils";

export type UniversalTaskType = "checklist" | "duration" | "quantity";

export function getTaskType(task: Task): UniversalTaskType {
  if (task.quantityTarget && task.quantityTarget > 0) return "quantity";
  if (task.durationTargetMinutes && task.durationTargetMinutes > 0) return "duration";
  return "checklist";
}

/**
 * Checks whether a task is scheduled on a given date.
 */
export function isTaskScheduled(
  task: Task,
  dateStr: string,
  daysLookup?: Record<string, DayData>
): boolean {
  if (task.recurrence) {
    return isTaskScheduledOnDate(task.recurrence, dateStr);
  }
  // One-time task: matches dueDate, or exists in stored day tasks
  if (task.dueDate) return task.dueDate === dateStr;
  if (daysLookup && daysLookup[dateStr]) {
    return daysLookup[dateStr].tasks.some((t) => t.id === task.id);
  }
  return false;
}

export interface TaskDayStatus {
  date: string;
  isScheduled: boolean;
  completed: boolean;
  pct: number;
  // Checklist specific
  completedAt?: number | null;
  // Duration specific
  durationTarget?: number;
  durationCompleted?: number;
  // Quantity specific
  quantityTarget?: number;
  quantityCompleted?: number;
  quantityUnit?: string;
}

/**
 * Resolves the complete status of a task on a specific calendar date.
 */
export function getTaskStatusOnDate(
  task: Task,
  dateStr: string,
  daysLookup?: Record<string, DayData>
): TaskDayStatus {
  const type = getTaskType(task);
  const scheduled = isTaskScheduled(task, dateStr, daysLookup);

  if (type === "duration") {
    const target = task.durationTargetMinutes || 0;
    let completedMinutes = 0;

    if (task.recurrence) {
      if (task.durationCompletedDates && typeof task.durationCompletedDates[dateStr] === "number") {
        completedMinutes = task.durationCompletedDates[dateStr];
      } else if (task.completedDates && task.completedDates[dateStr]) {
        completedMinutes = target;
      }
    } else {
      if (task.durationCompletedDates && typeof task.durationCompletedDates[dateStr] === "number") {
        completedMinutes = task.durationCompletedDates[dateStr];
      } else if (daysLookup && daysLookup[dateStr]) {
        const found = daysLookup[dateStr].tasks.find((t) => t.id === task.id);
        if (found && typeof found.durationCompletedMinutes === "number") {
          completedMinutes = found.durationCompletedMinutes;
        } else if (found?.completed) {
          completedMinutes = target;
        }
      } else if (task.dueDate === dateStr || (!task.dueDate && dateStr === todayStr())) {
        completedMinutes = task.durationCompletedMinutes ?? (task.completed ? target : 0);
      }
    }

    const pct = calculateDurationPct(completedMinutes, target);
    const completed = target > 0 && completedMinutes >= target;

    return {
      date: dateStr,
      isScheduled: scheduled,
      completed,
      pct,
      durationTarget: target,
      durationCompleted: completedMinutes
    };
  }

  if (type === "quantity") {
    const target = task.quantityTarget || 0;
    const completedQty = getTaskQuantityOnDate(task, dateStr, daysLookup);
    const pct = calculateQuantityPct(completedQty, target);
    const completed = target > 0 && completedQty >= target;

    return {
      date: dateStr,
      isScheduled: scheduled,
      completed,
      pct,
      quantityTarget: target,
      quantityCompleted: completedQty,
      quantityUnit: task.quantityUnit ?? ""
    };
  }

  // Standard Checklist Task
  let isDone = false;
  let completedAt: number | null = null;

  if (task.recurrence) {
    if (task.completedDates && task.completedDates[dateStr]) {
      isDone = true;
      completedAt = task.completedDates[dateStr];
    }
  } else {
    if (daysLookup && daysLookup[dateStr]) {
      const found = daysLookup[dateStr].tasks.find((t) => t.id === task.id);
      if (found) {
        isDone = found.completed;
        completedAt = found.completedAt;
      }
    } else if (task.dueDate === dateStr || (!task.dueDate && dateStr === todayStr())) {
      isDone = task.completed;
      completedAt = task.completedAt;
    }
  }

  return {
    date: dateStr,
    isScheduled: scheduled,
    completed: isDone,
    pct: isDone ? 100 : 0,
    completedAt
  };
}

export interface TaskStreakResult {
  currentStreak: number;
  bestStreak: number;
  bestStreakRange?: {
    startDate: string;
    endDate: string;
  } | null;
}

/**
 * Calculates task-specific streaks across scheduled days.
 * Non-scheduled days do not break a streak.
 */
export function calculateUniversalTaskStreak(
  task: Task,
  untilDate: string = todayStr(),
  daysLookup?: Record<string, DayData>
): TaskStreakResult {
  // Collect all known relevant dates
  const dateSet = new Set<string>();
  if (task.recurrence?.startDate && isValidDateStr(task.recurrence.startDate)) {
    dateSet.add(task.recurrence.startDate);
  }
  if (task.completedDates) {
    Object.keys(task.completedDates).forEach((d) => dateSet.add(d));
  }
  if (task.durationCompletedDates) {
    Object.keys(task.durationCompletedDates).forEach((d) => dateSet.add(d));
  }
  if (task.quantityCompletedDates) {
    Object.keys(task.quantityCompletedDates).forEach((d) => dateSet.add(d));
  }
  if (task.dueDate) dateSet.add(task.dueDate);
  if (daysLookup) {
    Object.keys(daysLookup).forEach((d) => {
      if (daysLookup[d]?.tasks.some((t) => t.id === task.id)) {
        dateSet.add(d);
      }
    });
  }
  dateSet.add(untilDate);

  const sortedDates = Array.from(dateSet).sort();
  if (sortedDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0, bestStreakRange: null };
  }

  // Earliest date to scan from: clamp to at most 365 days before untilDate if needed
  const earliestRecorded = sortedDates[0];
  const maxLookback = addDays(untilDate, -365);
  const scanStartDate = earliestRecorded < maxLookback ? maxLookback : earliestRecorded;

  // Build ordered list of all scheduled days from scanStartDate to untilDate
  const scheduledDaysList: { date: string; completed: boolean }[] = [];
  let d = scanStartDate;
  while (d <= untilDate) {
    const status = getTaskStatusOnDate(task, d, daysLookup);
    if (status.isScheduled) {
      scheduledDaysList.push({ date: d, completed: status.completed });
    }
    d = addDays(d, 1);
  }

  if (scheduledDaysList.length === 0) {
    return { currentStreak: 0, bestStreak: 0, bestStreakRange: null };
  }

  // 1. Calculate Best Streak & range across scheduled occurrences
  let running = 0;
  let runningStart: string | null = null;
  let best = 0;
  let bestStart: string | null = null;
  let bestEnd: string | null = null;

  for (const item of scheduledDaysList) {
    if (item.completed) {
      if (running === 0) {
        runningStart = item.date;
      }
      running++;
      if (running > best) {
        best = running;
        bestStart = runningStart;
        bestEnd = item.date;
      }
    } else {
      running = 0;
      runningStart = null;
    }
  }

  // 2. Calculate Current Streak
  // If today is scheduled and completed -> walk backwards
  // If today is scheduled and NOT completed -> check if streak was active up to the previous scheduled day
  // If today is NOT scheduled -> check if previous scheduled day was completed
  let currentStreak = 0;
  const lastScheduled = scheduledDaysList[scheduledDaysList.length - 1];

  if (lastScheduled.date === untilDate) {
    if (lastScheduled.completed) {
      // Today is completed: count backwards
      for (let i = scheduledDaysList.length - 1; i >= 0; i--) {
        if (scheduledDaysList[i].completed) {
          currentStreak++;
        } else {
          break;
        }
      }
    } else {
      // Today is not yet completed: streak is still active from yesterday/previous scheduled day!
      if (scheduledDaysList.length >= 2 && scheduledDaysList[scheduledDaysList.length - 2].completed) {
        for (let i = scheduledDaysList.length - 2; i >= 0; i--) {
          if (scheduledDaysList[i].completed) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }
  } else {
    // Today was not scheduled: streak is active if last scheduled day was completed
    if (lastScheduled.completed) {
      for (let i = scheduledDaysList.length - 1; i >= 0; i--) {
        if (scheduledDaysList[i].completed) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }

  best = Math.max(best, currentStreak);

  return {
    currentStreak,
    bestStreak: best,
    bestStreakRange:
      best > 0 && bestStart && bestEnd
        ? { startDate: bestStart, endDate: bestEnd }
        : null
  };
}

export interface UniversalTaskOverviewStats {
  taskType: UniversalTaskType;
  currentStreak: number;
  bestStreak: number;
  bestStreakRange?: { startDate: string; endDate: string } | null;
  totalScheduledDays: number;
  totalCompletedDays: number;
  completionRate: number; // 0 - 100%
  // Duration specific
  totalDurationMinutes: number;
  avgDailyDurationMinutes: number;
  avgDailyDurationOnLoggedDays: number;
  // Quantity specific
  totalQuantity: number;
  avgDailyQuantity: number;
  avgDailyQuantityOnLoggedDays: number;
  quantityUnit: string;
  // Focus specific
  focusDaysCount: number;
  loggedDaysCount: number;
  // Best day
  bestDay: {
    date: string;
    label: string;
    completed: boolean;
    pct: number;
    amount?: number;
    amountFormatted?: string;
    contextText: string;
  } | null;
  bestDayEmptyLabel: string;
}

interface DayCandidateRecord {
  date: string;
  isScheduled: boolean;
  completed: boolean;
  pct: number;
  durationMins: number;
  quantity: number;
}

/**
 * Derives comprehensive statistics across authoritative task history.
 */
export function calculateUniversalOverviewStats(
  task: Task,
  untilDate: string = todayStr(),
  daysLookup?: Record<string, DayData>
): UniversalTaskOverviewStats {
  const type = getTaskType(task);
  const streaks = calculateUniversalTaskStreak(task, untilDate, daysLookup);

  // Scan backwards up to 365 days or since start date
  const earliestDate = task.recurrence?.startDate || addDays(untilDate, -365);
  const scanStart = earliestDate < addDays(untilDate, -365) ? addDays(untilDate, -365) : earliestDate;

  let totalScheduled = 0;
  let totalCompleted = 0;
  let totalDurationMinutes = 0;
  let totalQuantity = 0;
  let loggedDaysCount = 0;

  const candidateDays: DayCandidateRecord[] = [];

  let d = scanStart;
  while (d <= untilDate) {
    const status = getTaskStatusOnDate(task, d, daysLookup);

    if (status.isScheduled || status.completed || (status.durationCompleted ?? 0) > 0 || (status.quantityCompleted ?? 0) > 0) {
      if (status.isScheduled) {
        totalScheduled++;
      }
      if (status.completed) {
        totalCompleted++;
      }

      const durMins = status.durationCompleted || 0;
      const qty = status.quantityCompleted || 0;

      if (type === "duration") {
        totalDurationMinutes += durMins;
        if (durMins > 0) loggedDaysCount++;
      } else if (type === "quantity") {
        totalQuantity += qty;
        if (qty > 0) loggedDaysCount++;
      } else {
        if (status.completed) loggedDaysCount++;
      }

      candidateDays.push({
        date: d,
        isScheduled: status.isScheduled,
        completed: status.completed,
        pct: status.pct,
        durationMins: durMins,
        quantity: qty
      });
    }

    d = addDays(d, 1);
  }

  // Scheduled count fallback
  const scheduledDivisor = Math.max(1, totalScheduled);
  const loggedDivisor = Math.max(1, loggedDaysCount);
  const completionRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

  // Focus days count
  const focusDaysCount = task.focusDates ? Object.keys(task.focusDates).length : task.focusDate ? 1 : 0;

  // Deterministic Best Day calculation
  let bestDay: UniversalTaskOverviewStats["bestDay"] = null;
  let bestDayEmptyLabel = "No completed day yet";

  if (type === "checklist") {
    bestDayEmptyLabel = "No completed day yet";
    const completedDays = candidateDays.filter((c) => c.completed);
    if (completedDays.length > 0) {
      // Prefer scheduled completed day, then most recent date
      completedDays.sort((a, b) => {
        if (a.isScheduled !== b.isScheduled) {
          return a.isScheduled ? -1 : 1;
        }
        return b.date.localeCompare(a.date);
      });
      const top = completedDays[0];
      const dateFormatted = formatBestDayDate(top.date);
      bestDay = {
        date: top.date,
        label: dateFormatted,
        completed: true,
        pct: 100,
        amount: 1,
        amountFormatted: "Completed ✓",
        contextText: `${dateFormatted} · Completed ✓`
      };
    }
  } else if (type === "duration") {
    bestDayEmptyLabel = "No progress day yet";
    const target = task.durationTargetMinutes || 0;
    const progressDays = candidateDays.filter((c) => c.durationMins > 0);

    if (progressDays.length > 0) {
      const targetReached = progressDays.filter((c) => target > 0 && c.durationMins >= target);
      let pool: DayCandidateRecord[];

      if (targetReached.length > 0) {
        // If a target-reaching day exists, it should be preferred
        pool = targetReached;
      } else {
        // If no target has ever been reached, use the highest-progress scheduled day if available, else any progress day
        const scheduled = progressDays.filter((c) => c.isScheduled);
        pool = scheduled.length > 0 ? scheduled : progressDays;
      }

      // Deterministic sort:
      // 1. pct (descending)
      // 2. durationMins (descending)
      // 3. isScheduled (scheduled > non-scheduled)
      // 4. date descending (most recent date wins)
      pool.sort((a, b) => {
        if (b.pct !== a.pct) return b.pct - a.pct;
        if (b.durationMins !== a.durationMins) return b.durationMins - a.durationMins;
        if (a.isScheduled !== b.isScheduled) return a.isScheduled ? -1 : 1;
        return b.date.localeCompare(a.date);
      });

      const top = pool[0];
      const dateFormatted = formatBestDayDate(top.date);
      const formattedLogged = formatDuration(top.durationMins);
      const formattedTarget = formatDuration(target);
      const contextText = `${dateFormatted} · ${top.pct}% · ${formattedLogged} / ${formattedTarget}`;
      bestDay = {
        date: top.date,
        label: dateFormatted,
        completed: top.completed,
        pct: top.pct,
        amount: top.durationMins,
        amountFormatted: `${formattedLogged} / ${formattedTarget}`,
        contextText
      };
    }
  } else {
    // Quantity
    bestDayEmptyLabel = "No logged day yet";
    const target = task.quantityTarget || 0;
    const unit = (task.quantityUnit || "").trim();
    const loggedDays = candidateDays.filter((c) => c.quantity > 0);

    if (loggedDays.length > 0) {
      const targetReached = loggedDays.filter((c) => target > 0 && c.quantity >= target);
      let pool: DayCandidateRecord[];

      if (targetReached.length > 0) {
        // If at least one day reached 100%, prefer the strongest target-reaching day
        pool = targetReached;
      } else {
        // If no day reached 100%, show the highest-progress scheduled day
        const scheduled = loggedDays.filter((c) => c.isScheduled);
        pool = scheduled.length > 0 ? scheduled : loggedDays;
      }

      // Deterministic sort:
      // 1. pct (descending)
      // 2. quantity (descending)
      // 3. isScheduled (scheduled > non-scheduled)
      // 4. date descending (most recent date wins)
      pool.sort((a, b) => {
        if (b.pct !== a.pct) return b.pct - a.pct;
        if (b.quantity !== a.quantity) return b.quantity - a.quantity;
        if (a.isScheduled !== b.isScheduled) return a.isScheduled ? -1 : 1;
        return b.date.localeCompare(a.date);
      });

      const top = pool[0];
      const dateFormatted = formatBestDayDate(top.date);
      const formattedLogged = formatQuantity(top.quantity, unit);
      const formattedTarget = formatQuantity(target, unit);
      const contextText = `${dateFormatted} · ${top.pct}% · ${formattedLogged} / ${formattedTarget}`;
      bestDay = {
        date: top.date,
        label: dateFormatted,
        completed: top.completed,
        pct: top.pct,
        amount: top.quantity,
        amountFormatted: `${formattedLogged} / ${formattedTarget}`,
        contextText
      };
    }
  }

  return {
    taskType: type,
    currentStreak: streaks.currentStreak,
    bestStreak: streaks.bestStreak,
    bestStreakRange: streaks.bestStreakRange,
    totalScheduledDays: totalScheduled,
    totalCompletedDays: totalCompleted,
    completionRate,
    totalDurationMinutes,
    avgDailyDurationMinutes: Math.round(totalDurationMinutes / scheduledDivisor),
    avgDailyDurationOnLoggedDays: Math.round(totalDurationMinutes / loggedDivisor),
    totalQuantity: Math.round(totalQuantity * 10) / 10,
    avgDailyQuantity: Math.round((totalQuantity / scheduledDivisor) * 10) / 10,
    avgDailyQuantityOnLoggedDays: Math.round((totalQuantity / loggedDivisor) * 10) / 10,
    quantityUnit: task.quantityUnit ?? "",
    focusDaysCount,
    loggedDaysCount,
    bestDay,
    bestDayEmptyLabel
  };
}

export interface WeekdayFrequency {
  dayNumber: number; // 1 = Mon, ..., 0 = Sun
  label: string;
  short: string;
  scheduledCount: number;
  completedCount: number;
  rate: number; // 0 - 100%
}

/**
 * Computes frequency by weekday for days on which the task was actually scheduled.
 */
export function calculateWeekdayFrequency(
  task: Task,
  untilDate: string = todayStr(),
  daysLookup?: Record<string, DayData>
): WeekdayFrequency[] {
  const weekdayDef = [
    { dayNumber: 1, label: "Monday", short: "Mon" },
    { dayNumber: 2, label: "Tuesday", short: "Tue" },
    { dayNumber: 3, label: "Wednesday", short: "Wed" },
    { dayNumber: 4, label: "Thursday", short: "Thu" },
    { dayNumber: 5, label: "Friday", short: "Fri" },
    { dayNumber: 6, label: "Saturday", short: "Sat" },
    { dayNumber: 0, label: "Sunday", short: "Sun" }
  ];

  const stats: Record<number, { scheduled: number; completed: number }> = {
    1: { scheduled: 0, completed: 0 },
    2: { scheduled: 0, completed: 0 },
    3: { scheduled: 0, completed: 0 },
    4: { scheduled: 0, completed: 0 },
    5: { scheduled: 0, completed: 0 },
    6: { scheduled: 0, completed: 0 },
    0: { scheduled: 0, completed: 0 }
  };

  // Scan backwards up to 180 days
  const scanStart = addDays(untilDate, -180);
  let d = scanStart;
  while (d <= untilDate) {
    const status = getTaskStatusOnDate(task, d, daysLookup);
    if (status.isScheduled) {
      const dayNum = parseDateStr(d).getDay();
      stats[dayNum].scheduled++;
      if (status.completed) {
        stats[dayNum].completed++;
      }
    }
    d = addDays(d, 1);
  }

  // Filter to only days that were actually scheduled at least once
  return weekdayDef
    .map((w) => {
      const item = stats[w.dayNumber];
      const rate = item.scheduled > 0 ? Math.round((item.completed / item.scheduled) * 100) : 0;
      return {
        ...w,
        scheduledCount: item.scheduled,
        completedCount: item.completed,
        rate
      };
    })
    .filter((w) => w.scheduledCount > 0);
}

export interface UniversalPeriodSummary {
  periodDaysCount: number;
  scheduledDays: number;
  completedDays: number;
  completionRate: number;
  totalDurationMinutes: number;
  avgDurationMinutes: number;
  loggedDaysCount: number;
  avgDurationLoggedMinutes: number;
  totalQuantity: number;
  avgQuantity: number;
  avgQuantityLogged: number;
}

/**
 * Calculates a summary over a specific set of dates (e.g. current week, current month).
 */
export function getUniversalPeriodSummary(
  task: Task,
  dates: string[],
  daysLookup?: Record<string, DayData>
): UniversalPeriodSummary {
  let scheduled = 0;
  let completed = 0;
  let totalMinutes = 0;
  let totalQty = 0;
  let loggedDaysCount = 0;

  for (const d of dates) {
    const status = getTaskStatusOnDate(task, d, daysLookup);
    if (status.isScheduled) {
      scheduled++;
    }
    if (status.completed) {
      completed++;
    }
    const mins = status.durationCompleted || 0;
    const qty = status.quantityCompleted || 0;
    totalMinutes += mins;
    totalQty += qty;
    if (mins > 0 || qty > 0 || status.completed) {
      loggedDaysCount++;
    }
  }

  const scheduledDivisor = Math.max(1, scheduled);
  const loggedDivisor = Math.max(1, loggedDaysCount);

  return {
    periodDaysCount: dates.length,
    scheduledDays: scheduled,
    completedDays: completed,
    completionRate: scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0,
    totalDurationMinutes: totalMinutes,
    avgDurationMinutes: Math.round(totalMinutes / scheduledDivisor),
    loggedDaysCount,
    avgDurationLoggedMinutes: Math.round(totalMinutes / loggedDivisor),
    totalQuantity: Math.round(totalQty * 10) / 10,
    avgQuantity: Math.round((totalQty / scheduledDivisor) * 10) / 10,
    avgQuantityLogged: Math.round((totalQty / loggedDivisor) * 10) / 10
  };
}
