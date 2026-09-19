export type Priority = 1 | 2 | 3; // 1 = High, 2 = Medium, 3 = Low

export type CategoryId =
  | ""
  | "study"
  | "workout"
  | "health"
  | "work"
  | "personal"
  | "other";

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
}

export const CURRENT_DATA_VERSION = 1;
