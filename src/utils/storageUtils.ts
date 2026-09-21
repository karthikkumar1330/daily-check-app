import type { AppData, CategoryId, CountdownGoalsData, DayData, Priority, ReminderMinutes, RoutinesData, Task, TaskRecurrence, ThemePreference } from "../types";
import { CURRENT_DATA_VERSION } from "../types";
import { isValidDateStr } from "./dateUtils";
import { loadCountdownGoals, saveCountdownGoals } from "./countdownStorage";
import { loadRoutines, sanitizeRoutines, saveRoutines } from "./routineStorage";

const STORAGE_KEY = "dailyCheck.data";

function emptyAppData(): AppData {
  return { version: CURRENT_DATA_VERSION, days: {}, theme: "auto", recurringTasks: [] };
}

function sanitizeDueDate(raw: any): string | null {
  if (typeof raw === "string" && isValidDateStr(raw.trim())) {
    return raw.trim();
  }
  return null;
}

function sanitizeDueTime(raw: any): string | null {
  if (typeof raw === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.trim())) {
    return raw.trim();
  }
  return null;
}

function sanitizeReminderMinutes(raw: any, dueTime: string | null): ReminderMinutes | null {
  if (!dueTime) return null;
  if (typeof raw === "number" && [0, 5, 15, 30, 60].includes(raw)) {
    return raw as ReminderMinutes;
  }
  return null;
}

function sanitizeRecurrence(raw: any): TaskRecurrence | null {
  if (!raw || typeof raw !== "object") return null;
  if (!["daily", "weekly", "weekdays", "custom"].includes(raw.type)) return null;
  if (!isValidDateStr(raw.startDate)) return null;
  const clean: TaskRecurrence = {
    type: raw.type,
    startDate: raw.startDate
  };
  if (raw.endDate && isValidDateStr(raw.endDate)) {
    clean.endDate = raw.endDate;
  }
  if (Array.isArray(raw.daysOfWeek)) {
    clean.daysOfWeek = raw.daysOfWeek.filter((d: any) => typeof d === "number" && d >= 0 && d <= 6);
  }
  return clean;
}

function sanitizeCompletedDates(raw: any): Record<string, number> {
  const clean: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return clean;
  Object.entries(raw).forEach(([date, ts]) => {
    if (isValidDateStr(date) && typeof ts === "number") {
      clean[date] = ts;
    }
  });
  return clean;
}

function sanitizeFocusDate(raw: any): string | null {
  if (typeof raw === "string" && isValidDateStr(raw)) {
    return raw;
  }
  return null;
}

function sanitizeFocusDates(raw: any): Record<string, number> {
  const clean: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return clean;
  Object.entries(raw).forEach(([date, val]) => {
    if (isValidDateStr(date) && (typeof val === "number" || typeof val === "boolean")) {
      clean[date] = typeof val === "number" ? val : Date.now();
    }
  });
  return clean;
}

function sanitizeRecurringTasks(raw: unknown): Task[] {
  if (!Array.isArray(raw)) return [];
  const tasks: Task[] = [];
  for (const t of raw) {
    if (!t || typeof t !== "object" || typeof (t as Record<string, unknown>).id !== "string" || typeof (t as Record<string, unknown>).title !== "string") {
      continue;
    }
    const item = t as Record<string, any>;
    const rec = sanitizeRecurrence(item.recurrence);
    if (!rec) continue;
    const dueDate = sanitizeDueDate(item.dueDate);
    const dueTime = sanitizeDueTime(item.dueTime);
    const reminderMinutes = sanitizeReminderMinutes(item.reminderMinutes, dueTime);
    tasks.push({
      id: item.id,
      title: item.title,
      completed: false,
      priority: [1, 2, 3].includes(item.priority) ? item.priority : 2,
      category: (typeof item.category === "string" ? item.category : "") as CategoryId,
      notes: typeof item.notes === "string" ? item.notes : "",
      createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
      completedAt: null,
      order: typeof item.order === "number" ? item.order : Date.now(),
      recurrence: rec,
      completedDates: sanitizeCompletedDates(item.completedDates),
      dueDate,
      dueTime,
      reminderMinutes,
      focusDate: sanitizeFocusDate(item.focusDate),
      focusDates: sanitizeFocusDates(item.focusDates)
    });
  }
  return tasks;
}

/**
 * Sanitizes a days map from untrusted/parsed JSON, dropping anything
 * malformed rather than throwing, so one bad record can't crash the app.
 */
function sanitizeDays(raw: unknown): Record<string, DayData> {
  const clean: Record<string, DayData> = {};
  if (!raw || typeof raw !== "object") return clean;

  Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
    if (!isValidDateStr(key)) return;
    if (!value || typeof value !== "object") return;
    const d = value as Partial<DayData>;
    if (!Array.isArray(d.tasks)) return;

    const tasks = d.tasks.filter((t): t is DayData["tasks"][number] => {
      return (
        !!t &&
        typeof t === "object" &&
        typeof (t as any).id === "string" &&
        typeof (t as any).title === "string" &&
        typeof (t as any).completed === "boolean"
      );
    }).map((t) => {
      const dueDate = sanitizeDueDate((t as any).dueDate);
      const dueTime = sanitizeDueTime((t as any).dueTime);
      const reminderMinutes = sanitizeReminderMinutes((t as any).reminderMinutes, dueTime);
      const routineId = typeof (t as any).routineId === "string" ? (t as any).routineId : null;
      const routineTaskId = typeof (t as any).routineTaskId === "string" ? (t as any).routineTaskId : null;
      return {
        id: t.id,
        title: t.title,
        completed: !!t.completed,
        priority: [1, 2, 3].includes((t as any).priority) ? (t as any).priority : 2,
        category: typeof (t as any).category === "string" ? (t as any).category : "",
        notes: typeof (t as any).notes === "string" ? (t as any).notes : "",
        createdAt: typeof (t as any).createdAt === "number" ? (t as any).createdAt : Date.now(),
        completedAt: typeof (t as any).completedAt === "number" ? (t as any).completedAt : null,
        order: typeof (t as any).order === "number" ? (t as any).order : Date.now(),
        recurrence: sanitizeRecurrence((t as any).recurrence),
        completedDates: sanitizeCompletedDates((t as any).completedDates),
        dueDate,
        dueTime,
        reminderMinutes,
        routineId,
        routineTaskId,
        focusDate: sanitizeFocusDate((t as any).focusDate),
        focusDates: sanitizeFocusDates((t as any).focusDates)
      };
    });

    clean[key] = {
      date: key,
      tasks,
      createdAt: typeof d.createdAt === "number" ? d.createdAt : Date.now(),
      updatedAt: typeof d.updatedAt === "number" ? d.updatedAt : Date.now()
    };
  });

  return clean;
}

/**
 * Migration system: each function upgrades data from its key version to key+1.
 * Add new migrations here as the schema evolves; never delete user data,
 * only transform it forward.
 */
const migrations: Record<number, (data: any) => any> = {
  // Example for the future:
  // 1: (data) => ({ ...data, version: 2, /* new fields */ }),
};

function migrate(data: any): AppData {
  let current = data;
  let safety = 0;
  while (current.version < CURRENT_DATA_VERSION && migrations[current.version] && safety < 50) {
    current = migrations[current.version](current);
    safety++;
  }
  if (current.version !== CURRENT_DATA_VERSION) {
    // Unknown future version or no migration path: keep the data as-is
    // rather than discarding it, just stamp it to the current version.
    current = { ...current, version: CURRENT_DATA_VERSION };
  }
  return current;
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyAppData();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyAppData();

    const withVersion = {
      version: typeof parsed.version === "number" ? parsed.version : 1,
      days: sanitizeDays(parsed.days),
      theme: (["auto", "light", "dark"].includes(parsed.theme) ? parsed.theme : "auto") as ThemePreference,
      recurringTasks: sanitizeRecurringTasks(parsed.recurringTasks)
    };

    return migrate(withVersion);
  } catch (e) {
    console.error("Daily Check: could not read stored data. Backing up corrupted data.", e);
    // Preserve corrupted data under a recovery key before starting clean
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        localStorage.setItem(`dailyCheck.corrupted_recovery.${Date.now()}`, raw);
      }
    } catch {
      // Ignore fallback error
    }
    return emptyAppData();
  }
}

/** Calculates total approximate KB stored in localStorage by Daily Check keys */
export function getStorageUsageKb(): string {
  try {
    let totalChars = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("dailyCheck")) {
        const val = localStorage.getItem(key) ?? "";
        totalChars += key.length + val.length;
      }
    }
    const kb = (totalChars * 2) / 1024; // 2 bytes per UTF-16 character
    return kb < 0.1 ? "< 0.1 KB" : `${kb.toFixed(1)} KB`;
  } catch {
    return "Unknown";
  }
}

export function saveData(data: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Daily Check: could not save data.", e);
    return false;
  }
}

/** Triggers a browser download of the full backup as JSON. */
export function exportBackup(data: AppData, goalsData?: CountdownGoalsData, routinesData?: RoutinesData): void {
  const currentGoals = goalsData ?? loadCountdownGoals();
  const currentRoutines = routinesData ?? loadRoutines();

  const payload = {
    ...data,
    countdownGoals: currentGoals,
    routines: currentRoutines,
    exportedAt: new Date().toISOString(),
    app: "daily-check"
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "daily-check-backup.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  ok: boolean;
  data?: AppData;
  countdownGoals?: CountdownGoalsData;
  routines?: RoutinesData;
  error?: string;
}

/** Validates and parses a backup file's text content. Never throws. */
export function parseImportFile(text: string): ImportResult {
  const genericError = "Couldn't import this backup. Check that the file is a valid Daily Check backup.";

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: genericError };
  }

  if (!parsed || typeof parsed !== "object" || typeof parsed.days !== "object" || parsed.days === null) {
    return { ok: false, error: genericError };
  }
  if (parsed.version !== undefined && typeof parsed.version !== "number") {
    return { ok: false, error: genericError };
  }

  try {
    const days = sanitizeDays(parsed.days);
    const data: AppData = {
      version: typeof parsed.version === "number" ? parsed.version : CURRENT_DATA_VERSION,
      days,
      theme: (["auto", "light", "dark"].includes(parsed.theme) ? parsed.theme : "auto") as ThemePreference,
      recurringTasks: sanitizeRecurringTasks(parsed.recurringTasks)
    };

    let countdownGoals: CountdownGoalsData | undefined;
    if (parsed.countdownGoals && typeof parsed.countdownGoals === "object") {
      countdownGoals = {
        version: typeof parsed.countdownGoals.version === "number" ? parsed.countdownGoals.version : 1,
        goals: parsed.countdownGoals.goals || {},
        primaryGoalId: parsed.countdownGoals.primaryGoalId || null
      };
    }

    let routines: RoutinesData | undefined;
    if (parsed.routines && typeof parsed.routines === "object") {
      routines = {
        version: typeof parsed.routines.version === "number" ? parsed.routines.version : 1,
        routines: sanitizeRoutines(parsed.routines.routines ?? parsed.routines)
      };
    }

    return { ok: true, data: migrate(data), countdownGoals, routines };
  } catch {
    return { ok: false, error: genericError };
  }
}
