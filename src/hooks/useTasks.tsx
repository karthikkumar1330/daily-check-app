import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AppData, CategoryId, DayData, Priority, Task, TaskRecurrence, ThemePreference } from "../types";
import { addDays } from "../utils/dateUtils";
import { resolveDayData } from "../utils/recurrenceUtils";
import { loadData, saveData } from "../utils/storageUtils";
import { newDay, newTask } from "../utils/taskUtils";

interface TasksContextValue {
  appData: AppData;
  getDay: (date: string) => DayData;
  addTask: (
    date: string,
    title: string,
    priority?: Priority,
    category?: CategoryId,
    notes?: string,
    recurrence?: TaskRecurrence | null
  ) => void;
  toggleTask: (date: string, id: string) => void;
  saveEdit: (date: string, id: string, updates: Partial<Task>) => void;
  deleteTask: (date: string, id: string) => void;
  moveTask: (date: string, id: string, direction: "up" | "down") => void;
  clearCompleted: (date: string) => void;
  setTheme: (t: ThemePreference) => void;
  replaceAllData: (data: AppData) => void;
}

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [appData, setAppData] = useState<AppData>(() => loadData());

  useEffect(() => {
    saveData(appData);
  }, [appData]);

  function updateDay(date: string, updater: (day: DayData) => DayData) {
    setAppData((prev) => {
      const existing = prev.days[date] ?? newDay(date);
      const updated = updater(existing);
      return { ...prev, days: { ...prev.days, [date]: updated } };
    });
  }

  function getDay(date: string): DayData {
    return resolveDayData(date, appData.days[date], appData.recurringTasks ?? []);
  }

  function addTask(
    date: string,
    title: string,
    priority: Priority = 2,
    category: CategoryId = "",
    notes = "",
    recurrence: TaskRecurrence | null = null
  ) {
    const trimmed = title.trim();
    if (!trimmed) return;

    if (recurrence) {
      const recWithStart: TaskRecurrence = {
        ...recurrence,
        startDate: recurrence.startDate || date
      };
      const task = newTask(trimmed, priority, category, recWithStart);
      if (notes.trim()) task.notes = notes.trim();

      setAppData((prev) => ({
        ...prev,
        recurringTasks: [...(prev.recurringTasks ?? []), task]
      }));
      return;
    }

    updateDay(date, (day) => {
      const task = newTask(trimmed, priority, category);
      if (notes.trim()) task.notes = notes.trim();
      return { ...day, tasks: [...day.tasks, task], updatedAt: Date.now() };
    });
  }

  function toggleTask(date: string, id: string) {
    const isRecurring = (appData.recurringTasks ?? []).some((t) => t.id === id);
    if (isRecurring) {
      setAppData((prev) => ({
        ...prev,
        recurringTasks: (prev.recurringTasks ?? []).map((t) => {
          if (t.id !== id) return t;
          const isDone = Boolean(t.completedDates?.[date]);
          const nextDates = { ...(t.completedDates ?? {}) };
          if (isDone) {
            delete nextDates[date];
          } else {
            nextDates[date] = Date.now();
          }
          return { ...t, completedDates: nextDates };
        })
      }));
      return;
    }

    updateDay(date, (day) => ({
      ...day,
      tasks: day.tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : null } : t
      ),
      updatedAt: Date.now()
    }));
  }

  function saveEdit(date: string, id: string, updates: Partial<Task>) {
    const isRecurring = (appData.recurringTasks ?? []).some((t) => t.id === id);

    if (isRecurring) {
      // If user converted a recurring task to one-time (recurrence === null)
      if (updates.recurrence === null) {
        const existing = (appData.recurringTasks ?? []).find((t) => t.id === id);
        setAppData((prev) => {
          const filteredRecurring = (prev.recurringTasks ?? []).filter((t) => t.id !== id);
          const convertedTask: Task = {
            ...(existing ?? newTask(updates.title ?? "Task")),
            ...updates,
            recurrence: null,
            completed: Boolean(existing?.completedDates?.[date]),
            completedAt: existing?.completedDates?.[date] ?? null
          };
          const day = prev.days[date] ?? newDay(date);
          return {
            ...prev,
            recurringTasks: filteredRecurring,
            days: {
              ...prev.days,
              [date]: { ...day, tasks: [...day.tasks, convertedTask], updatedAt: Date.now() }
            }
          };
        });
        return;
      }

      // Preserve historical completion dates when updating definition
      setAppData((prev) => ({
        ...prev,
        recurringTasks: (prev.recurringTasks ?? []).map((t) => {
          if (t.id !== id) return t;
          return {
            ...t,
            ...updates,
            recurrence: updates.recurrence !== undefined ? updates.recurrence : t.recurrence,
            completedDates: t.completedDates ?? {}
          };
        })
      }));
      return;
    }

    // Check if one-time task was converted to recurring
    if (updates.recurrence) {
      const existing = (appData.days[date]?.tasks ?? []).find((t) => t.id === id);
      setAppData((prev) => {
        const day = prev.days[date] ?? newDay(date);
        const filteredTasks = day.tasks.filter((t) => t.id !== id);
        const recurringTask: Task = {
          ...(existing ?? newTask(updates.title ?? "Task")),
          ...updates,
          recurrence: updates.recurrence,
          completedDates: existing?.completed ? { [date]: existing.completedAt ?? Date.now() } : {}
        };
        return {
          ...prev,
          days: { ...prev.days, [date]: { ...day, tasks: filteredTasks, updatedAt: Date.now() } },
          recurringTasks: [...(prev.recurringTasks ?? []), recurringTask]
        };
      });
      return;
    }

    // Normal one-time edit
    updateDay(date, (day) => ({
      ...day,
      tasks: day.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      updatedAt: Date.now()
    }));
  }

  function deleteTask(date: string, id: string) {
    const isRecurring = (appData.recurringTasks ?? []).some((t) => t.id === id);
    if (isRecurring) {
      setAppData((prev) => {
        const existing = (prev.recurringTasks ?? []).find((t) => t.id === id);
        if (!existing) return prev;

        const pastDates = Object.keys(existing.completedDates ?? {}).filter((d) => d < date);
        const startDate = existing.recurrence?.startDate ?? date;

        if (pastDates.length > 0 && date > startDate) {
          // Preserve past completed occurrences by setting endDate to yesterday
          const yesterday = addDays(date, -1);
          const pastCompletions: Record<string, number> = {};
          pastDates.forEach((d) => {
            pastCompletions[d] = existing.completedDates![d];
          });
          return {
            ...prev,
            recurringTasks: (prev.recurringTasks ?? []).map((t) =>
              t.id === id
                ? {
                    ...t,
                    recurrence: t.recurrence ? { ...t.recurrence, endDate: yesterday } : null,
                    completedDates: pastCompletions
                  }
                : t
            )
          };
        }

        // Otherwise delete cleanly
        return {
          ...prev,
          recurringTasks: (prev.recurringTasks ?? []).filter((t) => t.id !== id)
        };
      });
      return;
    }

    updateDay(date, (day) => ({
      ...day,
      tasks: day.tasks.filter((t) => t.id !== id),
      updatedAt: Date.now()
    }));
  }

  function moveTask(date: string, id: string, direction: "up" | "down") {
    const day = getDay(date);
    const sorted = [...day.tasks].sort((a, b) => a.order - b.order);
    const i = sorted.findIndex((t) => t.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= sorted.length) return;

    const orderA = sorted[i].order;
    const orderB = sorted[j].order;
    const idA = sorted[i].id;
    const idB = sorted[j].id;

    setAppData((prev) => {
      const existingDay = prev.days[date];
      let nextDays = prev.days;
      if (existingDay) {
        const updatedTasks = existingDay.tasks.map((t) => {
          if (t.id === idA) return { ...t, order: orderB };
          if (t.id === idB) return { ...t, order: orderA };
          return t;
        });
        nextDays = {
          ...prev.days,
          [date]: { ...existingDay, tasks: updatedTasks, updatedAt: Date.now() }
        };
      }

      const nextRecurring = (prev.recurringTasks ?? []).map((t) => {
        if (t.id === idA) return { ...t, order: orderB };
        if (t.id === idB) return { ...t, order: orderA };
        return t;
      });

      return {
        ...prev,
        days: nextDays,
        recurringTasks: nextRecurring
      };
    });
  }

  function clearCompleted(date: string) {
    updateDay(date, (day) => ({
      ...day,
      tasks: day.tasks.filter((t) => !t.completed),
      updatedAt: Date.now()
    }));

    setAppData((prev) => ({
      ...prev,
      recurringTasks: (prev.recurringTasks ?? []).map((t) => {
        if (t.completedDates?.[date]) {
          const nextDates = { ...t.completedDates };
          delete nextDates[date];
          return { ...t, completedDates: nextDates };
        }
        return t;
      })
    }));
  }

  function setTheme(t: ThemePreference) {
    setAppData((prev) => ({ ...prev, theme: t }));
  }

  function replaceAllData(data: AppData) {
    setAppData(data);
  }

  const value: TasksContextValue = {
    appData,
    getDay,
    addTask,
    toggleTask,
    saveEdit,
    deleteTask,
    moveTask,
    clearCompleted,
    setTheme,
    replaceAllData
  };

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used within a TasksProvider");
  return ctx;
}
