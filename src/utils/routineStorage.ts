import type { CategoryId, Priority, ReminderMinutes, Routine, RoutineTask, RoutinesData } from "../types";
import { CURRENT_ROUTINES_VERSION } from "../types";

export const ROUTINES_STORAGE_KEY = "dailyCheck.routines.v1";

function uid(): string {
  return "routine_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function taskUid(): string {
  return "rt_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const DEFAULT_ROUTINES: Routine[] = [
  {
    id: "default_bank_exam",
    name: "Bank Exam Routine",
    icon: "🎓",
    tasks: [
      { id: "rt_1", title: "Quant Practice", priority: 1, category: "study", notes: "Sectional tests and arithmetic" },
      { id: "rt_2", title: "Reasoning Practice", priority: 1, category: "study", notes: "Puzzles and seating arrangements" },
      { id: "rt_3", title: "English Editorial", priority: 2, category: "study", notes: "Vocab notes and reading comprehension" },
      { id: "rt_4", title: "Current Affairs", priority: 2, category: "study", notes: "Daily news and quiz" },
      { id: "rt_5", title: "Mock Test", priority: 1, category: "study", notes: "Full length test with analysis" }
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  },
  {
    id: "default_workout",
    name: "Workout Routine",
    icon: "💪",
    tasks: [
      { id: "rt_6", title: "Push-ups", priority: 2, category: "workout", notes: "3 sets to failure" },
      { id: "rt_7", title: "Squats", priority: 2, category: "workout", notes: "4 sets of 15 reps" },
      { id: "rt_8", title: "Reverse Lunges", priority: 2, category: "workout", notes: "3 sets of 12 reps per leg" },
      { id: "rt_9", title: "Glute Bridge", priority: 3, category: "workout", notes: "3 sets of 15 reps" },
      { id: "rt_10", title: "Plank", priority: 2, category: "workout", notes: "3 sets of 60 seconds" }
    ],
    createdAt: 1700000001000,
    updatedAt: 1700000001000
  }
];

export function emptyRoutinesData(): RoutinesData {
  return { version: CURRENT_ROUTINES_VERSION, routines: {} };
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

export function sanitizeRoutineTasks(raw: unknown): RoutineTask[] {
  if (!Array.isArray(raw)) return [];
  const tasks: RoutineTask[] = [];

  for (const t of raw) {
    if (!t || typeof t !== "object") continue;
    const item = t as Record<string, any>;
    const title = typeof item.title === "string" ? item.title.trim() : "";
    if (!title) continue;

    const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : taskUid();
    const priority: Priority = [1, 2, 3].includes(item.priority) ? item.priority : 2;
    const important = Boolean(item.important);
    const category: CategoryId = typeof item.category === "string" ? (item.category as CategoryId) : "";
    const notes = typeof item.notes === "string" ? item.notes.trim() : "";
    const dueTime = sanitizeDueTime(item.dueTime);
    const reminderMinutes = sanitizeReminderMinutes(item.reminderMinutes, dueTime);
    const durationTargetMinutes =
      typeof item.durationTargetMinutes === "number" && item.durationTargetMinutes > 0
        ? Math.round(item.durationTargetMinutes)
        : null;
    const quantityTarget =
      typeof item.quantityTarget === "number" && item.quantityTarget > 0 ? item.quantityTarget : null;
    const quantityUnit = typeof item.quantityUnit === "string" ? item.quantityUnit.trim() : "";
    const quantityStep =
      typeof item.quantityStep === "number" && item.quantityStep > 0 ? item.quantityStep : 1;

    tasks.push({
      id,
      title,
      priority,
      important,
      category,
      notes,
      dueTime,
      reminderMinutes,
      durationTargetMinutes,
      quantityTarget,
      quantityUnit,
      quantityStep
    });
  }

  return tasks;
}

export function sanitizeRoutines(raw: unknown): Record<string, Routine> {
  const clean: Record<string, Routine> = {};
  if (!raw || typeof raw !== "object") return clean;

  const entries = Array.isArray(raw)
    ? raw.map((item) => [item?.id, item])
    : Object.entries(raw as Record<string, unknown>);

  for (const [idKey, val] of entries) {
    if (!val || typeof val !== "object") continue;
    const r = val as Partial<Routine>;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (!name) continue;

    const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : typeof idKey === "string" && idKey ? idKey : uid();
    const icon = typeof r.icon === "string" && r.icon.trim() ? r.icon.trim() : "📋";
    const tasks = sanitizeRoutineTasks(r.tasks);
    const createdAt = typeof r.createdAt === "number" ? r.createdAt : Date.now();
    const updatedAt = typeof r.updatedAt === "number" ? r.updatedAt : createdAt;

    clean[id] = {
      id,
      name,
      icon,
      tasks,
      createdAt,
      updatedAt
    };
  }

  return clean;
}

export function loadRoutines(): RoutinesData {
  try {
    const raw = localStorage.getItem(ROUTINES_STORAGE_KEY);
    if (!raw) {
      // First-time seed with default bank exam and workout templates
      const seeded: Record<string, Routine> = {};
      for (const def of DEFAULT_ROUTINES) {
        seeded[def.id] = def;
      }
      const data: RoutinesData = { version: CURRENT_ROUTINES_VERSION, routines: seeded };
      saveRoutines(data);
      return data;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyRoutinesData();

    const routines = sanitizeRoutines(parsed.routines);
    return {
      version: CURRENT_ROUTINES_VERSION,
      routines
    };
  } catch (e) {
    console.error("Daily Check: could not read stored routines. Backing up corrupted data.", e);
    try {
      const raw = localStorage.getItem(ROUTINES_STORAGE_KEY);
      if (raw) {
        localStorage.setItem(`dailyCheck.routines.corrupted_recovery.${Date.now()}`, raw);
      }
    } catch {
      // Ignore fallback error
    }
    return emptyRoutinesData();
  }
}

export function saveRoutines(data: RoutinesData): boolean {
  try {
    localStorage.setItem(ROUTINES_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Daily Check: could not save routines.", e);
    return false;
  }
}
