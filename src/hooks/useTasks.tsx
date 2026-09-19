import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AppData, CategoryId, DayData, Priority, Task, ThemePreference } from "../types";
import { loadData, saveData } from "../utils/storageUtils";
import { newDay, newTask } from "../utils/taskUtils";

interface TasksContextValue {
  appData: AppData;
  getDay: (date: string) => DayData;
  addTask: (date: string, title: string, priority?: Priority, category?: CategoryId, notes?: string) => void;
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
    return appData.days[date] ?? newDay(date);
  }

  function addTask(date: string, title: string, priority: Priority = 2, category: CategoryId = "", notes = "") {
    const trimmed = title.trim();
    if (!trimmed) return;
    updateDay(date, (day) => {
      const task = newTask(trimmed, priority, category);
      if (notes.trim()) task.notes = notes.trim();
      return { ...day, tasks: [...day.tasks, task], updatedAt: Date.now() };
    });
  }

  function toggleTask(date: string, id: string) {
    updateDay(date, (day) => ({
      ...day,
      tasks: day.tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : null } : t
      ),
      updatedAt: Date.now()
    }));
  }

  function saveEdit(date: string, id: string, updates: Partial<Task>) {
    updateDay(date, (day) => ({
      ...day,
      tasks: day.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      updatedAt: Date.now()
    }));
  }

  function deleteTask(date: string, id: string) {
    updateDay(date, (day) => ({
      ...day,
      tasks: day.tasks.filter((t) => t.id !== id),
      updatedAt: Date.now()
    }));
  }

  function moveTask(date: string, id: string, direction: "up" | "down") {
    updateDay(date, (day) => {
      const sorted = [...day.tasks].sort((a, b) => a.order - b.order);
      const i = sorted.findIndex((t) => t.id === id);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= sorted.length) return day;
      const tmp = sorted[i].order;
      sorted[i] = { ...sorted[i], order: sorted[j].order };
      sorted[j] = { ...sorted[j], order: tmp };
      return { ...day, tasks: sorted, updatedAt: Date.now() };
    });
  }

  function clearCompleted(date: string) {
    updateDay(date, (day) => ({
      ...day,
      tasks: day.tasks.filter((t) => !t.completed),
      updatedAt: Date.now()
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
