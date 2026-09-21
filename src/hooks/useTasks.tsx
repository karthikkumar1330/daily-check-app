import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AppData, CategoryId, DayData, Priority, ReminderMinutes, Task, TaskRecurrence, ThemePreference } from "../types";
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
    recurrence?: TaskRecurrence | null,
    dueTime?: string | null,
    reminderMinutes?: ReminderMinutes | null,
    dueDate?: string | null
  ) => void;
  addTasks: (
    date: string,
    tasksToAdd: Array<{
      title: string;
      priority?: Priority;
      category?: CategoryId;
      notes?: string;
      dueTime?: string | null;
      reminderMinutes?: ReminderMinutes | null;
      dueDate?: string | null;
      routineId?: string | null;
      routineTaskId?: string | null;
    }>
  ) => void;
  toggleTask: (date: string, id: string) => void;
  toggleFocus: (date: string, id: string) => { ok: boolean; reason?: string };
  setFocusTasks: (date: string, taskIds: string[]) => { ok: boolean; reason?: string };
  saveEdit: (date: string, id: string, updates: Partial<Task>) => void;
  rescheduleTask: (sourceDate: string, id: string, targetDate: string) => { ok: boolean; reason?: string };
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
    recurrence: TaskRecurrence | null = null,
    dueTime: string | null = null,
    reminderMinutes: ReminderMinutes | null = null,
    dueDate: string | null = null
  ) {
    const trimmed = title.trim();
    if (!trimmed) return;

    if (recurrence) {
      const recWithStart: TaskRecurrence = {
        ...recurrence,
        startDate: recurrence.startDate || date
      };
      const task = newTask(trimmed, priority, category, recWithStart, dueTime, reminderMinutes, null);
      if (notes.trim()) task.notes = notes.trim();

      setAppData((prev) => ({
        ...prev,
        recurringTasks: [...(prev.recurringTasks ?? []), task]
      }));
      return;
    }

    const targetDate = dueDate && dueDate.trim() ? dueDate.trim() : date;
    updateDay(targetDate, (day) => {
      const task = newTask(trimmed, priority, category, null, dueTime, reminderMinutes, dueDate || null);
      if (notes.trim()) task.notes = notes.trim();
      return { ...day, tasks: [...day.tasks, task], updatedAt: Date.now() };
    });
  }

  function addTasks(
    date: string,
    tasksToAdd: Array<{
      title: string;
      priority?: Priority;
      category?: CategoryId;
      notes?: string;
      dueTime?: string | null;
      reminderMinutes?: ReminderMinutes | null;
      dueDate?: string | null;
      routineId?: string | null;
      routineTaskId?: string | null;
    }>
  ) {
    if (!tasksToAdd || tasksToAdd.length === 0) return;
    updateDay(date, (day) => {
      const baseOrder = day.tasks.length > 0 ? Math.max(...day.tasks.map((t) => t.order)) + 100 : Date.now();
      const valid = tasksToAdd.filter((item) => item.title && item.title.trim());
      const created = valid.map((item, idx) => {
        const task = newTask(
          item.title.trim(),
          item.priority ?? 2,
          item.category ?? "",
          null,
          item.dueTime ?? null,
          item.reminderMinutes ?? null,
          item.dueDate ?? null,
          item.routineId ?? null,
          item.routineTaskId ?? null
        );
        if (item.notes && item.notes.trim()) task.notes = item.notes.trim();
        task.order = baseOrder + idx * 10;
        return task;
      });
      return { ...day, tasks: [...day.tasks, ...created], updatedAt: Date.now() };
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

  function toggleFocus(date: string, id: string): { ok: boolean; reason?: string } {
    const day = getDay(date);
    const target = day.tasks.find((t) => t.id === id);
    if (!target) return { ok: false, reason: "Task not found." };

    const isCurrentlyFocused = target.focusDate === date;

    if (isCurrentlyFocused) {
      const isRecurring = (appData.recurringTasks ?? []).some((t) => t.id === id);
      if (isRecurring) {
        setAppData((prev) => ({
          ...prev,
          recurringTasks: (prev.recurringTasks ?? []).map((t) => {
            if (t.id !== id) return t;
            const nextFocusDates = { ...(t.focusDates ?? {}) };
            delete nextFocusDates[date];
            return {
              ...t,
              focusDates: nextFocusDates,
              focusDate: t.focusDate === date ? null : t.focusDate
            };
          })
        }));
      } else {
        updateDay(date, (d) => ({
          ...d,
          tasks: d.tasks.map((t) => (t.id === id ? { ...t, focusDate: null } : t)),
          updatedAt: Date.now()
        }));
      }
      return { ok: true };
    }

    const currentFocusCount = day.tasks.filter((t) => t.focusDate === date).length;
    if (currentFocusCount >= 3) {
      return { ok: false, reason: "You can choose up to 3 focus tasks per day." };
    }

    const isRecurring = (appData.recurringTasks ?? []).some((t) => t.id === id);
    if (isRecurring) {
      setAppData((prev) => ({
        ...prev,
        recurringTasks: (prev.recurringTasks ?? []).map((t) => {
          if (t.id !== id) return t;
          return {
            ...t,
            focusDates: { ...(t.focusDates ?? {}), [date]: Date.now() }
          };
        })
      }));
    } else {
      updateDay(date, (d) => ({
        ...d,
        tasks: d.tasks.map((t) => (t.id === id ? { ...t, focusDate: date } : t)),
        updatedAt: Date.now()
      }));
    }

    return { ok: true };
  }

  function setFocusTasks(date: string, taskIds: string[]): { ok: boolean; reason?: string } {
    if (taskIds.length > 3) {
      return { ok: false, reason: "You can choose up to 3 focus tasks per day." };
    }

    const focusIdSet = new Set(taskIds);

    setAppData((prev) => {
      const updatedRecurring = (prev.recurringTasks ?? []).map((rt) => {
        const nextFocusDates = { ...(rt.focusDates ?? {}) };
        if (focusIdSet.has(rt.id)) {
          nextFocusDates[date] = Date.now();
        } else {
          delete nextFocusDates[date];
        }
        return {
          ...rt,
          focusDates: nextFocusDates,
          focusDate: rt.focusDate === date ? (focusIdSet.has(rt.id) ? date : null) : rt.focusDate
        };
      });

      const day = prev.days[date] ?? newDay(date);
      const updatedDayTasks = day.tasks.map((t) => {
        if (t.recurrence) return t;
        return {
          ...t,
          focusDate: focusIdSet.has(t.id) ? date : null
        };
      });

      return {
        ...prev,
        recurringTasks: updatedRecurring,
        days: {
          ...prev.days,
          [date]: { ...day, tasks: updatedDayTasks, updatedAt: Date.now() }
        }
      };
    });

    return { ok: true };
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

    // Normal one-time edit with date change
    if (updates.dueDate && updates.dueDate !== date) {
      const targetDate = updates.dueDate;
      setAppData((prev) => {
        const srcDay = prev.days[date] ?? newDay(date);
        const dstDay = prev.days[targetDate] ?? newDay(targetDate);
        const existing = srcDay.tasks.find((t) => t.id === id);
        if (!existing) return prev;
        const newOrder =
          dstDay.tasks.length > 0 ? Math.max(...dstDay.tasks.map((t) => t.order)) + 100 : Date.now();
        const updatedTask: Task = {
          ...existing,
          ...updates,
          dueDate: targetDate,
          focusDate: null,
          order: newOrder
        };
        return {
          ...prev,
          days: {
            ...prev.days,
            [date]: { ...srcDay, tasks: srcDay.tasks.filter((t) => t.id !== id), updatedAt: Date.now() },
            [targetDate]: { ...dstDay, tasks: [...dstDay.tasks, updatedTask], updatedAt: Date.now() }
          }
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

  function rescheduleTask(
    sourceDate: string,
    id: string,
    targetDate: string
  ): { ok: boolean; reason?: string } {
    if (!targetDate || typeof targetDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate.trim())) {
      return { ok: false, reason: "Invalid target date." };
    }

    const cleanTargetDate = targetDate.trim();

    // Protect recurring tasks: their recurrence definition must not be modified by normal rescheduling
    const isRecurring = (appData.recurringTasks ?? []).some((t) => t.id === id);
    if (isRecurring) {
      return { ok: false, reason: "Recurring task dates are controlled by its recurrence schedule." };
    }

    // Locate source task
    let foundTask: Task | null = null;
    let actualSourceDate = sourceDate;

    if (appData.days[sourceDate]?.tasks.some((t) => t.id === id)) {
      foundTask = appData.days[sourceDate].tasks.find((t) => t.id === id) ?? null;
      actualSourceDate = sourceDate;
    } else {
      for (const [d, dayData] of Object.entries(appData.days)) {
        const match = dayData.tasks.find((t) => t.id === id);
        if (match) {
          foundTask = match;
          actualSourceDate = d;
          break;
        }
      }
    }

    if (!foundTask) {
      return { ok: false, reason: "Task not found." };
    }

    if (actualSourceDate === cleanTargetDate) {
      return { ok: true, reason: "Task is already scheduled for this date." };
    }

    setAppData((prev) => {
      const srcDay = prev.days[actualSourceDate] ?? newDay(actualSourceDate);
      const dstDay = prev.days[cleanTargetDate] ?? newDay(cleanTargetDate);

      const taskToMove = srcDay.tasks.find((t) => t.id === id) ?? foundTask!;
      const remainingSrcTasks = srcDay.tasks.filter((t) => t.id !== id);

      const newOrder =
        dstDay.tasks.length > 0 ? Math.max(...dstDay.tasks.map((t) => t.order)) + 100 : Date.now();

      const updatedTask: Task = {
        ...taskToMove,
        dueDate: cleanTargetDate,
        focusDate: null, // Rescheduling removes from old day's focus; destination day does not auto-focus
        order: newOrder
      };

      return {
        ...prev,
        days: {
          ...prev.days,
          [actualSourceDate]: {
            ...srcDay,
            tasks: remainingSrcTasks,
            updatedAt: Date.now()
          },
          [cleanTargetDate]: {
            ...dstDay,
            tasks: [...dstDay.tasks, updatedTask],
            updatedAt: Date.now()
          }
        }
      };
    });

    return { ok: true };
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
    addTasks,
    toggleTask,
    toggleFocus,
    setFocusTasks,
    saveEdit,
    rescheduleTask,
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
