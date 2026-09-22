import type { DayData, Task } from "../types";
import { addDays, parseDateStr, todayStr } from "./dateUtils";

export interface QuantityPreset {
  id: string;
  name: string;
  emoji: string;
  target: number;
  unit: string;
  step: number;
}

export const QUANTITY_PRESETS: QuantityPreset[] = [
  { id: "water-l", name: "Water (L)", emoji: "💧", target: 4, unit: "L", step: 0.5 },
  { id: "water-ml", name: "Water (ml)", emoji: "💧", target: 2500, unit: "ml", step: 250 },
  { id: "steps", name: "Steps", emoji: "🚶", target: 10000, unit: "steps", step: 1000 },
  { id: "pages", name: "Pages Read", emoji: "📖", target: 30, unit: "pages", step: 5 },
  { id: "questions", name: "Questions", emoji: "❓", target: 50, unit: "questions", step: 5 }
];

/**
 * Calculates clamped progress percentage (0 - 100)
 */
export function calculateQuantityPct(
  completed: number | null | undefined,
  target: number | null | undefined
): number {
  if (!target || isNaN(target) || target <= 0) return 0;
  const current = Math.max(0, completed ?? 0);
  const rawPct = Math.round((current / target) * 100);
  if (isNaN(rawPct) || !isFinite(rawPct)) return 0;
  return Math.min(100, Math.max(0, rawPct));
}

/**
 * Formats a quantity number cleanly (e.g. 10000 -> "10,000", 0.5 -> "0.5", 3 -> "3")
 */
export function formatQuantityNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return "0";
  const abs = Math.abs(num);
  // Integer formatting with comma
  if (Number.isInteger(num)) {
    return num.toLocaleString();
  }
  // Decimal: limit to 2 decimal places and strip trailing zeros
  const rounded = Number(num.toFixed(2));
  return rounded.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

/**
 * Formats quantity with unit (e.g. "3 L", "10,000 steps")
 */
export function formatQuantity(value: number | null | undefined, unit?: string): string {
  const formatted = formatQuantityNumber(value);
  const u = (unit ?? "").trim();
  return u ? `${formatted} ${u}` : formatted;
}

/**
 * Formats progress string (e.g. "3 L / 4 L" or "7,500 / 10,000 steps")
 */
export function formatQuantityProgress(
  completed: number | null | undefined,
  target: number | null | undefined,
  unit?: string
): string {
  const c = formatQuantityNumber(completed);
  const t = formatQuantityNumber(target);
  const u = (unit ?? "").trim();
  return u ? `${c} ${u} / ${t} ${u}` : `${c} / ${t}`;
}

/**
 * Returns quick add increments tailored to the unit and step
 */
export function getQuickAddOptions(
  step: number = 1,
  unit: string = ""
): Array<{ label: string; delta: number }> {
  const cleanStep = step > 0 ? step : 1;
  const cleanUnit = unit.trim().toLowerCase();

  if (cleanUnit === "l" || cleanUnit === "liter" || cleanUnit === "liters") {
    return [
      { label: `+${formatQuantityNumber(cleanStep)} ${unit}`, delta: cleanStep },
      { label: `+${formatQuantityNumber(cleanStep * 2)} ${unit}`, delta: cleanStep * 2 }
    ];
  }

  if (cleanUnit === "ml") {
    return [
      { label: `+${formatQuantityNumber(cleanStep)} ml`, delta: cleanStep },
      { label: `+${formatQuantityNumber(cleanStep * 2)} ml`, delta: cleanStep * 2 }
    ];
  }

  return [
    { label: `+${formatQuantityNumber(cleanStep)}${unit ? " " + unit : ""}`, delta: cleanStep }
  ];
}

/**
 * Resolves the completed quantity for a specific date for a given task.
 */
export function getTaskQuantityOnDate(
  task: Task,
  dateStr: string,
  daysLookup?: Record<string, DayData>
): number {
  if (task.recurrence) {
    if (task.quantityCompletedDates && typeof task.quantityCompletedDates[dateStr] === "number") {
      return task.quantityCompletedDates[dateStr];
    }
    // If marked as completed in completedDates without explicit quantity: treat as target
    if (task.completedDates && task.completedDates[dateStr]) {
      return task.quantityTarget ?? 0;
    }
    return 0;
  }

  // One-time task: check its recorded date map first
  if (task.quantityCompletedDates && typeof task.quantityCompletedDates[dateStr] === "number") {
    return task.quantityCompletedDates[dateStr];
  }

  // Check if task exists in stored days for that date
  if (daysLookup && daysLookup[dateStr]) {
    const found = daysLookup[dateStr].tasks.find((t) => t.id === task.id);
    if (found && typeof found.quantityCompleted === "number") {
      return found.quantityCompleted;
    }
  }

  // Fallback to task's own dueDate matching
  if (task.dueDate === dateStr || (!task.dueDate && dateStr === todayStr())) {
    return task.quantityCompleted ?? 0;
  }

  return 0;
}

/**
 * Calculates quantity-specific streaks (consecutive days with completed >= target).
 */
export function calculateQuantityStreak(
  task: Task,
  untilDate: string = todayStr(),
  daysLookup?: Record<string, DayData>
): { currentStreak: number; bestStreak: number } {
  const target = task.quantityTarget;
  if (!target || target <= 0) return { currentStreak: 0, bestStreak: 0 };

  // Collect all known dates from quantityCompletedDates and daysLookup
  const dateSet = new Set<string>();
  if (task.quantityCompletedDates) {
    Object.keys(task.quantityCompletedDates).forEach((d) => dateSet.add(d));
  }
  if (task.completedDates) {
    Object.keys(task.completedDates).forEach((d) => dateSet.add(d));
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
  if (sortedDates.length === 0) return { currentStreak: 0, bestStreak: 0 };

  const firstDate = sortedDates[0];
  let checkDate = firstDate;
  let runningStreak = 0;
  let bestStreak = 0;

  // Track each consecutive day from first date up to untilDate
  while (checkDate <= untilDate) {
    const amount = getTaskQuantityOnDate(task, checkDate, daysLookup);
    const reached = amount >= target;

    if (reached) {
      runningStreak++;
      if (runningStreak > bestStreak) {
        bestStreak = runningStreak;
      }
    } else {
      runningStreak = 0;
    }

    checkDate = addDays(checkDate, 1);
  }

  // Calculate current streak: check if streak was active today or ended yesterday
  let currentStreak = 0;
  let walkDate = untilDate;
  const todayAmount = getTaskQuantityOnDate(task, walkDate, daysLookup);

  if (todayAmount >= target) {
    // Current day is reached, walk backwards
    while (getTaskQuantityOnDate(task, walkDate, daysLookup) >= target) {
      currentStreak++;
      walkDate = addDays(walkDate, -1);
      if (walkDate < firstDate) break;
    }
  } else {
    // Today not yet reached: check if yesterday was reached
    const yesterday = addDays(untilDate, -1);
    if (getTaskQuantityOnDate(task, yesterday, daysLookup) >= target) {
      walkDate = yesterday;
      while (getTaskQuantityOnDate(task, walkDate, daysLookup) >= target) {
        currentStreak++;
        walkDate = addDays(walkDate, -1);
        if (walkDate < firstDate) break;
      }
    }
  }

  return { currentStreak, bestStreak: Math.max(bestStreak, currentStreak) };
}

/**
 * Calculates historical averages and statistics for this specific goal
 */
export function calculateQuantityAverages(
  task: Task,
  daysLookup?: Record<string, DayData>
): {
  avgDaily: number;
  avgPct: number;
  daysTracked: number;
  targetReachedDays: number;
  totalQuantity: number;
  bestDay: { date: string; amount: number } | null;
} {
  const target = task.quantityTarget || 1;
  const recordedDates = new Set<string>();

  if (task.quantityCompletedDates) {
    Object.keys(task.quantityCompletedDates).forEach((d) => recordedDates.add(d));
  }
  if (task.completedDates) {
    Object.keys(task.completedDates).forEach((d) => recordedDates.add(d));
  }
  if (task.dueDate) recordedDates.add(task.dueDate);
  if (daysLookup) {
    Object.keys(daysLookup).forEach((d) => {
      if (daysLookup[d]?.tasks.some((t) => t.id === task.id)) {
        recordedDates.add(d);
      }
    });
  }

  let totalQuantity = 0;
  let totalPct = 0;
  let targetReachedDays = 0;
  let bestDay: { date: string; amount: number } | null = null;
  const dates = Array.from(recordedDates).sort();

  dates.forEach((d) => {
    const amount = getTaskQuantityOnDate(task, d, daysLookup);
    if (amount > 0 || (task.quantityCompletedDates && task.quantityCompletedDates[d] !== undefined)) {
      totalQuantity += amount;
      const pct = calculateQuantityPct(amount, target);
      totalPct += pct;
      if (amount >= target) {
        targetReachedDays++;
      }
      if (!bestDay || amount > bestDay.amount) {
        bestDay = { date: d, amount };
      }
    }
  });

  const count = dates.length > 0 ? dates.length : 1;
  const avgDaily = Number((totalQuantity / count).toFixed(2));
  const avgPct = Math.round(totalPct / count);

  return {
    avgDaily,
    avgPct,
    daysTracked: dates.length,
    targetReachedDays,
    totalQuantity: Number(totalQuantity.toFixed(2)),
    bestDay
  };
}

/**
 * Returns summary metrics for a list of week dates
 */
export function getPeriodQuantitySummary(
  task: Task,
  dates: string[],
  daysLookup?: Record<string, DayData>
): {
  total: number;
  avgDaily: number;
  reachedCount: number;
  totalDays: number;
  avgPct: number;
} {
  const target = task.quantityTarget || 1;
  let total = 0;
  let totalPct = 0;
  let reachedCount = 0;

  dates.forEach((d) => {
    const amt = getTaskQuantityOnDate(task, d, daysLookup);
    total += amt;
    const pct = calculateQuantityPct(amt, target);
    totalPct += pct;
    if (amt >= target) {
      reachedCount++;
    }
  });

  const totalDays = dates.length > 0 ? dates.length : 1;
  const avgDaily = Number((total / totalDays).toFixed(2));
  const avgPct = Math.round(totalPct / totalDays);

  return {
    total: Number(total.toFixed(2)),
    avgDaily,
    reachedCount,
    totalDays: dates.length,
    avgPct
  };
}
