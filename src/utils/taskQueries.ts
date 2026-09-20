import type { CategoryId, DayData, Task } from "../types";
import { todayStr } from "./dateUtils";
import { CATEGORIES } from "./taskUtils";

export interface DatedTask {
  task: Task;
  date: string;
}

/** Flattens every task across every stored day, newest date first. */
export function allTasksWithDates(days: Record<string, DayData>): DatedTask[] {
  const out: DatedTask[] = [];
  Object.keys(days)
    .sort()
    .forEach((date) => {
      const day = days[date];
      day.tasks.forEach((task) => out.push({ task, date }));
    });
  return out;
}

function sortByDateThenCreated(a: DatedTask, b: DatedTask): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return a.task.createdAt - b.task.createdAt;
}

export interface HighPriorityView {
  incomplete: DatedTask[];
  completed: DatedTask[];
}

/** High-priority (🔴) tasks, sorted by day then creation time. */
export function highPriorityTasks(days: Record<string, DayData>): HighPriorityView {
  const all = allTasksWithDates(days)
    .filter((dt) => dt.task.priority === 1)
    .sort(sortByDateThenCreated);
  return {
    incomplete: all.filter((dt) => !dt.task.completed),
    completed: all.filter((dt) => dt.task.completed)
  };
}

export interface ImportantGroups {
  today: DatedTask[];
  upcoming: DatedTask[];
  completed: DatedTask[];
}

/**
 * "Important" reuses the High Priority flag but organizes it by time instead
 * of a flat list: what's due today, what's coming up, and what's done.
 */
export function importantGroups(days: Record<string, DayData>): ImportantGroups {
  const today = todayStr();
  const all = allTasksWithDates(days).filter((dt) => dt.task.priority === 1);

  return {
    today: all.filter((dt) => dt.date === today && !dt.task.completed).sort(sortByDateThenCreated),
    upcoming: all
      .filter((dt) => dt.date > today && !dt.task.completed)
      .sort(sortByDateThenCreated),
    completed: all.filter((dt) => dt.task.completed).sort((a, b) => sortByDateThenCreated(b, a))
  };
}

export interface CategoryCount {
  id: CategoryId;
  label: string;
  emoji: string;
  active: number;
  completed: number;
}

/** Active/completed task counts per category, across all stored days. */
export function categoryStats(days: Record<string, DayData>): CategoryCount[] {
  const all = allTasksWithDates(days);
  return CATEGORIES.filter((c) => c.id !== "").map((c) => {
    const inCat = all.filter((dt) => dt.task.category === c.id);
    return {
      id: c.id,
      label: c.label,
      emoji: c.emoji,
      active: inCat.filter((dt) => !dt.task.completed).length,
      completed: inCat.filter((dt) => dt.task.completed).length
    };
  });
}

/** Tasks in a given category, most recent day first. */
export function tasksInCategory(days: Record<string, DayData>, category: CategoryId): DatedTask[] {
  return allTasksWithDates(days)
    .filter((dt) => dt.task.category === category)
    .sort((a, b) => sortByDateThenCreated(b, a));
}

/** Simple case-insensitive search across title, notes, and category label. */
export function searchTasks(days: Record<string, DayData>, query: string): DatedTask[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return allTasksWithDates(days)
    .filter((dt) => {
      const t = dt.task;
      const catLabel = CATEGORIES.find((c) => c.id === t.category)?.label ?? "";
      return (
        t.title.toLowerCase().includes(q) ||
        t.notes.toLowerCase().includes(q) ||
        catLabel.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => sortByDateThenCreated(b, a));
}

export function isUpcoming(date: string): boolean {
  return date > todayStr();
}
