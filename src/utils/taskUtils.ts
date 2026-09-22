import type { CategoryId, DayData, Priority, ReminderMinutes, Task, TaskRecurrence } from "../types";

let counter = 0;

export function uid(): string {
  counter += 1;
  return Date.now().toString(36) + counter.toString(36) + Math.random().toString(36).slice(2, 6);
}

export function newTask(
  title: string,
  priority: Priority = 2,
  category: CategoryId = "",
  recurrence: TaskRecurrence | null = null,
  dueTime: string | null = null,
  reminderMinutes: ReminderMinutes | null = null,
  dueDate: string | null = null,
  routineId: string | null = null,
  routineTaskId: string | null = null,
  durationTargetMinutes: number | null = null,
  quantityTarget: number | null = null,
  quantityUnit: string = "",
  quantityStep: number = 1
): Task {
  const now = Date.now();
  const cleanTarget =
    typeof durationTargetMinutes === "number" && !isNaN(durationTargetMinutes) && durationTargetMinutes > 0
      ? Math.round(durationTargetMinutes)
      : null;

  const cleanQuantityTarget =
    typeof quantityTarget === "number" && !isNaN(quantityTarget) && quantityTarget > 0
      ? quantityTarget
      : null;

  const cleanQuantityStep =
    typeof quantityStep === "number" && !isNaN(quantityStep) && quantityStep > 0
      ? quantityStep
      : 1;

  return {
    id: uid(),
    title,
    completed: false,
    priority,
    category,
    notes: "",
    createdAt: now,
    completedAt: null,
    order: now,
    recurrence: recurrence ?? null,
    completedDates: {},
    dueDate: dueDate ?? null,
    dueTime: dueTime ?? null,
    reminderMinutes: dueTime ? (reminderMinutes ?? null) : null,
    routineId: routineId ?? null,
    routineTaskId: routineTaskId ?? null,
    focusDate: null,
    focusDates: {},
    durationTargetMinutes: cleanTarget,
    durationCompletedMinutes: cleanTarget ? 0 : null,
    durationCompletedDates: {},
    quantityTarget: cleanQuantityTarget,
    quantityCompleted: cleanQuantityTarget ? 0 : null,
    quantityUnit: cleanQuantityTarget ? (quantityUnit ?? "").trim() : "",
    quantityStep: cleanQuantityStep,
    quantityCompletedDates: {}
  };
}

export function newDay(date: string): DayData {
  const now = Date.now();
  return { date, tasks: [], createdAt: now, updatedAt: now };
}

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  emoji: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "", label: "No category", emoji: "" },
  { id: "study", label: "Study", emoji: "\uD83D\uDCDA" },
  { id: "workout", label: "Workout", emoji: "\uD83D\uDCAA" },
  { id: "health", label: "Health", emoji: "\uD83E\uDDD8" },
  { id: "work", label: "Work", emoji: "\uD83D\uDCBC" },
  { id: "personal", label: "Personal", emoji: "\uD83C\uDFE0" },
  { id: "other", label: "Other", emoji: "\u2022" }
];

export function categoryMeta(id: CategoryId): CategoryMeta {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

export function prioLabel(p: Priority): string {
  return p === 1 ? "High" : p === 2 ? "Medium" : "Low";
}
export function prioClass(p: Priority): string {
  return p === 1 ? "prio-high" : p === 2 ? "prio-medium" : "prio-low";
}
export function prioEmoji(p: Priority): string {
  return p === 1 ? "\uD83D\uDD34" : p === 2 ? "\uD83D\uDFE1" : "\uD83D\uDFE2";
}
