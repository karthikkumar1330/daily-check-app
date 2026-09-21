import type { DayData, Task, TaskRecurrence } from "../types";
import { isValidDateStr, parseDateStr } from "./dateUtils";

export interface DayOfWeekOption {
  day: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  label: string;
  short: string;
}

/** Standard Mon-Sun sequence for UI controls */
export const DAYS_OF_WEEK_OPTIONS: DayOfWeekOption[] = [
  { day: 1, label: "Monday", short: "Mon" },
  { day: 2, label: "Tuesday", short: "Tue" },
  { day: 3, label: "Wednesday", short: "Wed" },
  { day: 4, label: "Thursday", short: "Thu" },
  { day: 5, label: "Friday", short: "Fri" },
  { day: 6, label: "Saturday", short: "Sat" },
  { day: 0, label: "Sunday", short: "Sun" }
];

/**
 * Checks whether a recurring task is scheduled to appear on a specific calendar date (YYYY-MM-DD).
 */
export function isTaskScheduledOnDate(
  recurrence: TaskRecurrence | null | undefined,
  dateStr: string
): boolean {
  if (!recurrence) return false;
  if (!isValidDateStr(dateStr) || !isValidDateStr(recurrence.startDate)) return false;

  // Rule 1: Before startDate -> do not show occurrence
  if (dateStr < recurrence.startDate) return false;

  // Rule 2: After endDate -> do not show occurrence
  if (recurrence.endDate && isValidDateStr(recurrence.endDate) && dateStr > recurrence.endDate) {
    return false;
  }

  const d = parseDateStr(dateStr);
  const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  switch (recurrence.type) {
    case "daily":
      return true;

    case "weekdays":
      // Monday (1) through Friday (5)
      return dayOfWeek >= 1 && dayOfWeek <= 5;

    case "weekly": {
      const targetDay =
        recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0
          ? recurrence.daysOfWeek[0]
          : parseDateStr(recurrence.startDate).getDay();
      return dayOfWeek === targetDay;
    }

    case "custom": {
      const days = recurrence.daysOfWeek ?? [];
      return days.includes(dayOfWeek);
    }

    default:
      return false;
  }
}

/**
 * Formats recurrence into a user-friendly label for task badges (e.g. "Every day", "Mon, Wed, Fri").
 */
export function formatRecurrenceLabel(recurrence: TaskRecurrence | null | undefined): string {
  if (!recurrence) return "";
  switch (recurrence.type) {
    case "daily":
      return "Every day";
    case "weekdays":
      return "Mon–Fri";
    case "weekly": {
      const targetDay =
        recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0
          ? recurrence.daysOfWeek[0]
          : parseDateStr(recurrence.startDate).getDay();
      const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return `Every ${names[targetDay] ?? "week"}`;
    }
    case "custom": {
      const days = recurrence.daysOfWeek ?? [];
      if (days.length === 7) return "Every day";
      if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return "Mon–Fri";
      if (days.length === 0) return "Custom";
      // Sort in Monday-first order: 1, 2, 3, 4, 5, 6, 0
      const sorted = [...days].sort((a, b) => {
        const orderA = a === 0 ? 7 : a;
        const orderB = b === 0 ? 7 : b;
        return orderA - orderB;
      });
      const shortNames: Record<number, string> = {
        1: "Mon",
        2: "Tue",
        3: "Wed",
        4: "Thu",
        5: "Fri",
        6: "Sat",
        0: "Sun"
      };
      return sorted.map((d) => shortNames[d] ?? "").filter(Boolean).join(", ");
    }
    default:
      return "";
  }
}

/**
 * Validates recurrence configuration. Returns true if valid.
 */
export function validateRecurrence(recurrence: TaskRecurrence | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!recurrence) return { valid: true };
  if (!isValidDateStr(recurrence.startDate)) {
    return { valid: false, error: "Invalid start date" };
  }
  if (recurrence.endDate) {
    if (!isValidDateStr(recurrence.endDate)) {
      return { valid: false, error: "Invalid end date" };
    }
    if (recurrence.endDate < recurrence.startDate) {
      return { valid: false, error: "End date cannot be before start date" };
    }
  }
  if (!["daily", "weekly", "weekdays", "custom"].includes(recurrence.type)) {
    return { valid: false, error: "Invalid recurrence type" };
  }
  if (recurrence.type === "custom") {
    if (!Array.isArray(recurrence.daysOfWeek) || recurrence.daysOfWeek.length === 0) {
      return { valid: false, error: "Please select at least one day" };
    }
  }
  return { valid: true };
}

/**
 * Resolves a date's DayData by combining one-time tasks stored on that day
 * with all active recurring tasks scheduled for that date.
 * Per-date completion is determined by task.completedDates[dateStr].
 */
export function resolveDayData(
  dateStr: string,
  storedDay: DayData | undefined,
  recurringTasks: Task[] = []
): DayData {
  // One-time tasks stored on this date
  const oneTimeTasks = (storedDay?.tasks ?? []).filter((t) => !t.recurrence);

  // Find all recurring tasks scheduled for this date
  const recurringOccurrences: Task[] = [];
  for (const rt of recurringTasks) {
    if (isTaskScheduledOnDate(rt.recurrence, dateStr)) {
      const isCompleted = Boolean(rt.completedDates?.[dateStr]);
      const completedAt = isCompleted ? (rt.completedDates?.[dateStr] ?? Date.now()) : null;
      const isFocus = Boolean(rt.focusDates?.[dateStr]) || rt.focusDate === dateStr;
      recurringOccurrences.push({
        ...rt,
        completed: isCompleted,
        completedAt,
        focusDate: isFocus ? dateStr : null
      });
    }
  }

  // Combine and sort by order (preserving natural creation/reorder sequence)
  const allTasks = [...oneTimeTasks, ...recurringOccurrences].sort((a, b) => a.order - b.order);

  return {
    date: dateStr,
    tasks: allTasks,
    createdAt: storedDay?.createdAt ?? Date.now(),
    updatedAt: storedDay?.updatedAt ?? Date.now()
  };
}
