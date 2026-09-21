import type { ReminderMinutes, Task } from "../types";
import { parseDateStr, toDateStr } from "./dateUtils";
import { isTaskScheduledOnDate } from "./recurrenceUtils";

/**
 * Validates whether a string matches "YYYY-MM-DD" format.
 */
export function isValidDateString(dateStr?: unknown): boolean {
  if (!dateStr || typeof dateStr !== "string") return false;
  const trimmed = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const parts = trimmed.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  return true;
}

/**
 * Validates whether a string matches "HH:MM" in 24-hour format (00:00 to 23:59).
 */
export function isValidTimeString(timeStr?: unknown): boolean {
  if (!timeStr || typeof timeStr !== "string") return false;
  const trimmed = timeStr.trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed);
}

/** Legacy alias for backwards-compatibility */
export const isValidTimeStr = isValidTimeString;

/**
 * Parses a "HH:MM" string safely into local hour and minute numbers.
 * Returns null if the string is invalid.
 */
export function parseTimeString(timeStr?: string | null): { hours: number; minutes: number } | null {
  if (!timeStr || !isValidTimeString(timeStr)) return null;
  const [hStr, mStr] = timeStr.trim().split(":");
  const hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr, 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return { hours, minutes };
}

/**
 * Formats a 24-hour time string ("14:30") to user-friendly representation ("2:30 PM", "9:05 AM", "12:00 AM").
 * Presentation only; never mutates stored values.
 */
export function formatTime(timeStr?: string | null): string {
  const parsed = parseTimeString(timeStr);
  if (!parsed) return "";
  const { hours: h, minutes: m } = parsed;
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m < 10 ? `0${m}` : `${m}`;
  return `${displayH}:${displayM} ${ampm}`;
}

/** Legacy alias for presentation format */
export const formatTimeDisplay = formatTime;

export type TaskScheduleStatus = "overdue" | "due" | "upcoming" | "completed" | "unscheduled";

/**
 * Determines the comprehensive schedule status of a task for a given calendar date.
 * Uses the local device date and time for comparison.
 */
export function getTaskScheduleStatus(
  task: Task | { dueTime?: string | null; completed?: boolean },
  dateStr: string,
  currentDateObj: Date = new Date()
): TaskScheduleStatus {
  if (task.completed) {
    return "completed";
  }

  if (!task.dueTime || !isValidTimeString(task.dueTime)) {
    return "unscheduled";
  }

  const parsedTime = parseTimeString(task.dueTime);
  if (!parsedTime) {
    return "unscheduled";
  }

  const today = toDateStr(currentDateObj);

  // If the target date is in the past, incomplete task with due time is overdue
  if (dateStr < today) {
    return "overdue";
  }

  // If the target date is in the future, it is upcoming
  if (dateStr > today) {
    return "upcoming";
  }

  // Target date is today: compare against current local hour and minute
  const curH = currentDateObj.getHours();
  const curM = currentDateObj.getMinutes();
  const { hours: dueH, minutes: dueM } = parsedTime;

  if (curH > dueH || (curH === dueH && curM > dueM)) {
    return "overdue";
  }

  if (curH === dueH && curM === dueM) {
    return "due";
  }

  return "upcoming";
}

export type TaskTimeStatus = "upcoming" | "due" | "overdue";

/**
 * Legacy helper evaluating time status for non-completed scheduled tasks.
 */
export function getTaskTimeStatus(
  dateStr: string,
  dueTime?: string | null,
  isCompleted?: boolean,
  currentDateObj: Date = new Date()
): TaskTimeStatus | null {
  if (isCompleted || !dueTime || !isValidTimeString(dueTime)) {
    return null;
  }
  const status = getTaskScheduleStatus({ dueTime, completed: false }, dateStr, currentDateObj);
  if (status === "overdue" || status === "due" || status === "upcoming") {
    return status;
  }
  return null;
}

/**
 * Checks whether a task has an occurrence on the given dateStr according to V6 recurrence
 * and dueDate definitions. Returns the valid occurrence date string or null.
 */
export function getTaskOccurrenceDate(task: Task, dateStr: string): string | null {
  if (!isValidDateString(dateStr)) return null;

  // Recurring task: check recurrence rules
  if (task.recurrence) {
    return isTaskScheduledOnDate(task.recurrence, dateStr) ? dateStr : null;
  }

  // One-time task with explicit dueDate
  if (task.dueDate) {
    return task.dueDate === dateStr ? dateStr : null;
  }

  // Standard one-time task
  return dateStr;
}

/**
 * Constructs a local Date object combining the calendar date and dueTime.
 * Only constructs when BOTH dateStr and dueTime are valid strings.
 * Never uses UTC-shifting date parsing.
 */
export function getTaskDueDateTime(task: Task, dateStr: string): Date | null {
  if (!isValidDateString(dateStr)) return null;
  if (!task.dueTime || !isValidTimeString(task.dueTime)) return null;

  const parsedTime = parseTimeString(task.dueTime);
  if (!parsedTime) return null;

  const dateObj = parseDateStr(dateStr);
  return new Date(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate(),
    parsedTime.hours,
    parsedTime.minutes,
    0,
    0
  );
}

export interface ReminderOption {
  value: ReminderMinutes | "none";
  label: string;
}

export const REMINDER_OPTIONS: ReminderOption[] = [
  { value: "none", label: "No reminder" },
  { value: 0, label: "At due time" },
  { value: 5, label: "5 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" }
];

export function getReminderLabel(mins?: ReminderMinutes | null): string {
  if (mins === null || mins === undefined) return "No reminder";
  const opt = REMINDER_OPTIONS.find((o) => o.value === mins);
  return opt ? opt.label : `${mins} mins before`;
}

/**
 * Orders tasks on a day according to V7 specification:
 * 1. Overdue incomplete tasks
 * 2. Due / current scheduled incomplete tasks
 * 3. Upcoming scheduled incomplete tasks
 * 4. Unscheduled incomplete tasks
 * 5. Completed tasks
 *
 * For equal schedule states, preserves natural priority/order sequence.
 */
export function sortTasksBySchedule(
  tasks: Task[],
  dateStr: string,
  currentDateObj: Date = new Date()
): Task[] {
  const overdue: Task[] = [];
  const due: Task[] = [];
  const upcoming: Task[] = [];
  const unscheduled: Task[] = [];
  const completed: Task[] = [];

  for (const t of tasks) {
    if (t.completed) {
      completed.push(t);
      continue;
    }

    const status = getTaskScheduleStatus(t, dateStr, currentDateObj);
    switch (status) {
      case "overdue":
        overdue.push(t);
        break;
      case "due":
        due.push(t);
        break;
      case "upcoming":
        upcoming.push(t);
        break;
      case "unscheduled":
      default:
        unscheduled.push(t);
        break;
    }
  }

  // Sort scheduled groups chronologically by dueTime, with natural order as secondary tie-breaker
  const sortByTime = (a: Task, b: Task) => {
    const timeA = a.dueTime ?? "";
    const timeB = b.dueTime ?? "";
    if (timeA !== timeB) {
      return timeA.localeCompare(timeB);
    }
    return a.order - b.order;
  };

  overdue.sort(sortByTime);
  due.sort(sortByTime);
  upcoming.sort(sortByTime);

  // Unscheduled tasks and completed tasks maintain their natural order
  unscheduled.sort((a, b) => a.order - b.order);
  completed.sort((a, b) => a.order - b.order);

  return [...overdue, ...due, ...upcoming, ...unscheduled, ...completed];
}

/** Backwards-compatible alias */
export const sortTasksWithSchedule = sortTasksBySchedule;
