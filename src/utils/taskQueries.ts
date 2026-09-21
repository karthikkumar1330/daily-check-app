import type { CategoryId, DayData, Task } from "../types";
import { todayStr } from "./dateUtils";
import { isTaskScheduledOnDate } from "./recurrenceUtils";
import { CATEGORIES } from "./taskUtils";

export interface DatedTask {
  task: Task;
  date: string;
}

/** Flattens every task across every stored day, including active recurring occurrences. */
export function allTasksWithDates(days: Record<string, DayData>, recurringTasks: Task[] = []): DatedTask[] {
  const out: DatedTask[] = [];
  const seen = new Set<string>();

  Object.keys(days)
    .sort()
    .forEach((date) => {
      const day = days[date];
      day.tasks.forEach((task) => {
        const key = `${task.id}_${date}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ task, date });
        }
      });
    });

  const today = todayStr();
  recurringTasks.forEach((rt) => {
    // Add today's occurrence if scheduled today
    if (isTaskScheduledOnDate(rt.recurrence, today)) {
      const key = `${rt.id}_${today}`;
      if (!seen.has(key)) {
        seen.add(key);
        const isCompleted = Boolean(rt.completedDates?.[today]);
        out.push({
          task: {
            ...rt,
            completed: isCompleted,
            completedAt: isCompleted ? (rt.completedDates?.[today] ?? null) : null
          },
          date: today
        });
      }
    }

    // Add historical completed occurrences
    if (rt.completedDates) {
      Object.entries(rt.completedDates).forEach(([cDate, completedAt]) => {
        const key = `${rt.id}_${cDate}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({
            task: {
              ...rt,
              completed: true,
              completedAt
            },
            date: cDate
          });
        }
      });
    }
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
export function highPriorityTasks(days: Record<string, DayData>, recurringTasks: Task[] = []): HighPriorityView {
  const all = allTasksWithDates(days, recurringTasks)
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
export function importantGroups(days: Record<string, DayData>, recurringTasks: Task[] = []): ImportantGroups {
  const today = todayStr();
  const all = allTasksWithDates(days, recurringTasks).filter((dt) => dt.task.priority === 1);

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

/** Active/completed task counts per category for a list of resolved tasks (e.g. from getDay(date).tasks) or all stored days. */
export function categoryStats(
  tasksOrDays: Task[] | Record<string, DayData>,
  recurringTasks: Task[] = []
): CategoryCount[] {
  if (Array.isArray(tasksOrDays)) {
    return CATEGORIES.filter((c) => c.id !== "").map((c) => {
      const inCat = tasksOrDays.filter((t) => {
        const taskCat = !t.category ? "other" : t.category;
        return taskCat === c.id;
      });
      return {
        id: c.id,
        label: c.label,
        emoji: c.emoji,
        active: inCat.filter((t) => !t.completed).length,
        completed: inCat.filter((t) => t.completed).length
      };
    });
  }

  const all = allTasksWithDates(tasksOrDays, recurringTasks);
  return CATEGORIES.filter((c) => c.id !== "").map((c) => {
    const inCat = all.filter((dt) => {
      const taskCat = !dt.task.category ? "other" : dt.task.category;
      return taskCat === c.id;
    });
    return {
      id: c.id,
      label: c.label,
      emoji: c.emoji,
      active: inCat.filter((dt) => !dt.task.completed).length,
      completed: inCat.filter((dt) => dt.task.completed).length
    };
  });
}

/** Tasks in a given category. */
export function tasksInCategory(
  tasksOrDays: Task[] | Record<string, DayData>,
  category: CategoryId,
  recurringTasks: Task[] = [],
  dateStr?: string
): DatedTask[] {
  if (Array.isArray(tasksOrDays)) {
    const fallbackDate = dateStr ?? todayStr();
    return tasksOrDays
      .filter((t) => {
        const taskCat = !t.category ? "other" : t.category;
        return taskCat === category;
      })
      .map((task) => ({ task, date: fallbackDate }));
  }

  return allTasksWithDates(tasksOrDays, recurringTasks)
    .filter((dt) => {
      const taskCat = !dt.task.category ? "other" : dt.task.category;
      return taskCat === category;
    })
    .sort((a, b) => sortByDateThenCreated(b, a));
}

/** Simple case-insensitive search across title, notes, and category label. */
export function searchTasks(days: Record<string, DayData>, query: string, recurringTasks: Task[] = []): DatedTask[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return allTasksWithDates(days, recurringTasks)
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
