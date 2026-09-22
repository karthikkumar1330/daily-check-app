export type Priority = 1 | 2 | 3; // 1 = High, 2 = Medium, 3 = Low

export type CategoryId =
  | ""
  | "study"
  | "workout"
  | "health"
  | "work"
  | "personal"
  | "other";

export type RecurrenceType = "daily" | "weekly" | "weekdays" | "custom";

export interface TaskRecurrence {
  type: RecurrenceType;
  /** 0 = Sun, 1 = Mon, ..., 6 = Sat */
  daysOfWeek?: number[];
  /** YYYY-MM-DD, inclusive */
  startDate: string;
  /** YYYY-MM-DD, inclusive (optional: empty means indefinite) */
  endDate?: string;
}

export type ReminderMinutes = 0 | 5 | 15 | 30 | 60;

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  category: CategoryId;
  notes: string;
  createdAt: number;
  completedAt: number | null;
  order: number;
  recurrence?: TaskRecurrence | null;
  /** Per-date completion tracking: date (YYYY-MM-DD) -> completedAt timestamp */
  completedDates?: Record<string, number>;
  /** Optional date override "YYYY-MM-DD" e.g. "2026-09-21" */
  dueDate?: string | null;
  /** Optional 24-hour time "HH:MM" e.g. "14:30" */
  dueTime?: string | null;
  /** Optional reminder minutes relative to due time */
  reminderMinutes?: ReminderMinutes | null;
  /** Optional origin tracking if created from a Routine template */
  routineId?: string | null;
  routineTaskId?: string | null;
  /** Focus date "YYYY-MM-DD" e.g. "2026-09-21" */
  focusDate?: string | null;
  /** Per-date focus tracking for recurring tasks: date (YYYY-MM-DD) -> timestamp */
  focusDates?: Record<string, number>;
  /** Optional target duration in minutes (e.g. 180 for 3 hours). Undefined/null for ordinary tasks */
  durationTargetMinutes?: number | null;
  /** Completed minutes for this instance (0 <= completed <= target) */
  durationCompletedMinutes?: number | null;
  /** Per-date duration completion tracking for recurring tasks: date (YYYY-MM-DD) -> completed minutes */
  durationCompletedDates?: Record<string, number>;
}

export interface DayData {
  date: string; // YYYY-MM-DD
  tasks: Task[];
  createdAt: number;
  updatedAt: number;
}

export interface DayStats {
  total: number;
  completed: number;
  remaining: number;
  /** null means the day has zero tasks — never treat this as 0% or 100%. */
  pct: number | null;
}

export interface WeekData {
  weekStart: string; // Monday, YYYY-MM-DD
  days: DayData[];
}

export type ThemePreference = "auto" | "light" | "dark";

/** The full shape persisted to localStorage (and used for export/import). */
export interface AppData {
  version: number;
  days: Record<string, DayData>;
  theme: ThemePreference;
  recurringTasks?: Task[];
}

export const CURRENT_DATA_VERSION = 1;

/* ---------------- Daily Templates / Routines (stored separately from tasks) ---------------- */

export interface RoutineTask {
  id: string;
  title: string;
  priority: Priority;
  category: CategoryId;
  notes: string;
  dueTime?: string | null;
  reminderMinutes?: ReminderMinutes | null;
  durationTargetMinutes?: number | null;
}

export interface Routine {
  id: string;
  name: string;
  icon: string;
  tasks: RoutineTask[];
  createdAt: number;
  updatedAt: number;
}

export interface RoutinesData {
  version: number;
  routines: Record<string, Routine>;
}

export const CURRENT_ROUTINES_VERSION = 1;

/* ---------------- Countdown Goals (calendar-day based, stored separately from tasks) ---------------- */

export interface CountdownGoal {
  id: string;
  title: string;
  /** YYYY-MM-DD, inclusive — the first day of the goal. */
  startDate: string;
  /** YYYY-MM-DD, inclusive — the final day of the goal. */
  targetDate: string;
  icon: string;
  description: string;
  createdAt: number;
}

/** The full shape persisted under its own localStorage key. */
export interface CountdownGoalsData {
  version: number;
  goals: Record<string, CountdownGoal>;
  /** The one goal shown on Today, or null if none/not yet chosen. */
  primaryGoalId: string | null;
}

export const CURRENT_COUNTDOWN_VERSION = 1;
