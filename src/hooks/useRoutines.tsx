import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Routine, RoutineTask, RoutinesData, Task } from "../types";
import { CURRENT_ROUTINES_VERSION } from "../types";
import { loadRoutines, saveRoutines } from "../utils/routineStorage";
import { useTasks } from "./useTasks";

function generateUid(prefix: string): string {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

interface RoutinesContextValue {
  routines: Routine[];
  routinesData: RoutinesData;
  getRoutine: (id: string) => Routine | undefined;
  createRoutine: (input: {
    name: string;
    icon?: string;
    tasks: Array<Omit<RoutineTask, "id"> & { id?: string }>;
  }) => { ok: boolean; routine?: Routine; error?: string };
  updateRoutine: (
    id: string,
    input: {
      name: string;
      icon?: string;
      tasks: RoutineTask[];
    }
  ) => { ok: boolean; error?: string };
  deleteRoutine: (id: string) => void;
  replaceAllRoutines: (data: RoutinesData) => void;
  isRoutineAppliedOnDate: (routineId: string, dayTasks: Task[]) => boolean;
  applyRoutineToDate: (
    routineId: string,
    date: string,
    options?: { force?: boolean }
  ) => { ok: boolean; count: number; alreadyApplied?: boolean; routineName?: string };
}

const RoutinesContext = createContext<RoutinesContextValue | null>(null);

export function RoutinesProvider({ children }: { children: ReactNode }) {
  const [routinesData, setRoutinesData] = useState<RoutinesData>(() => loadRoutines());
  const { getDay, addTasks } = useTasks();
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    saveRoutines(routinesData);
  }, [routinesData]);

  const routinesList = useMemo(() => {
    return Object.values(routinesData.routines).sort((a, b) => a.createdAt - b.createdAt);
  }, [routinesData.routines]);

  function getRoutine(id: string): Routine | undefined {
    return routinesData.routines[id];
  }

  function createRoutine(input: {
    name: string;
    icon?: string;
    tasks: Array<Omit<RoutineTask, "id"> & { id?: string }>;
  }): { ok: boolean; routine?: Routine; error?: string } {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      return { ok: false, error: "Please enter a routine name." };
    }

    const cleanTasks: RoutineTask[] = (input.tasks || [])
      .map((t) => ({
        id: t.id && t.id.trim() ? t.id.trim() : generateUid("rt"),
        title: t.title.trim(),
        priority: t.priority ?? 2,
        important: Boolean(t.important),
        category: t.category ?? "",
        notes: t.notes ? t.notes.trim() : "",
        dueTime: t.dueTime ?? null,
        reminderMinutes: t.dueTime ? (t.reminderMinutes ?? null) : null,
        durationTargetMinutes: t.durationTargetMinutes ?? null,
        quantityTarget: t.quantityTarget ?? null,
        quantityUnit: t.quantityUnit ?? "",
        quantityStep: t.quantityStep ?? 1
      }))
      .filter((t) => t.title.length > 0);

    if (cleanTasks.length === 0) {
      return { ok: false, error: "Please add at least one task to the routine." };
    }

    const id = generateUid("routine");
    const now = Date.now();
    const newRoutine: Routine = {
      id,
      name: trimmedName,
      icon: input.icon && input.icon.trim() ? input.icon.trim() : "📋",
      tasks: cleanTasks,
      createdAt: now,
      updatedAt: now
    };

    setRoutinesData((prev) => ({
      ...prev,
      routines: {
        ...prev.routines,
        [id]: newRoutine
      }
    }));

    return { ok: true, routine: newRoutine };
  }

  function updateRoutine(
    id: string,
    input: {
      name: string;
      icon?: string;
      tasks: RoutineTask[];
    }
  ): { ok: boolean; error?: string } {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      return { ok: false, error: "Please enter a routine name." };
    }

    const cleanTasks: RoutineTask[] = (input.tasks || [])
      .map((t) => ({
        id: t.id && t.id.trim() ? t.id.trim() : generateUid("rt"),
        title: t.title.trim(),
        priority: t.priority ?? 2,
        important: Boolean(t.important),
        category: t.category ?? "",
        notes: t.notes ? t.notes.trim() : "",
        dueTime: t.dueTime ?? null,
        reminderMinutes: t.dueTime ? (t.reminderMinutes ?? null) : null,
        durationTargetMinutes: t.durationTargetMinutes ?? null,
        quantityTarget: t.quantityTarget ?? null,
        quantityUnit: t.quantityUnit ?? "",
        quantityStep: t.quantityStep ?? 1
      }))
      .filter((t) => t.title.length > 0);

    if (cleanTasks.length === 0) {
      return { ok: false, error: "Please add at least one task to the routine." };
    }

    setRoutinesData((prev) => {
      const existing = prev.routines[id];
      if (!existing) return prev;
      const updated: Routine = {
        ...existing,
        name: trimmedName,
        icon: input.icon && input.icon.trim() ? input.icon.trim() : existing.icon || "📋",
        tasks: cleanTasks,
        updatedAt: Date.now()
      };
      return {
        ...prev,
        routines: {
          ...prev.routines,
          [id]: updated
        }
      };
    });

    return { ok: true };
  }

  function deleteRoutine(id: string) {
    setRoutinesData((prev) => {
      const nextRoutines = { ...prev.routines };
      delete nextRoutines[id];
      return {
        ...prev,
        routines: nextRoutines
      };
    });
  }

  function replaceAllRoutines(data: RoutinesData) {
    setRoutinesData({
      version: typeof data.version === "number" ? data.version : CURRENT_ROUTINES_VERSION,
      routines: data.routines || {}
    });
  }

  /**
   * Checks if this routine has already been applied to today's task list.
   * Checks both origin routineId tags and matching task titles.
   */
  function isRoutineAppliedOnDate(routineId: string, dayTasks: Task[]): boolean {
    if (!dayTasks || dayTasks.length === 0) return false;
    const routine = routinesData.routines[routineId];
    if (!routine || routine.tasks.length === 0) return false;

    // Direct match by routineId
    const hasTaggedTasks = dayTasks.some((t) => t.routineId === routineId);
    if (hasTaggedTasks) return true;

    // Match if all non-empty routine tasks are present in day's tasks
    const dayTaskTitles = new Set(dayTasks.map((t) => t.title.trim().toLowerCase()));
    const allTitlesPresent = routine.tasks.every((rt) => dayTaskTitles.has(rt.title.trim().toLowerCase()));
    return allTitlesPresent;
  }

  /**
   * Applies routine tasks to the given date checklist.
   * Returns result status and count of tasks created.
   */
  function applyRoutineToDate(
    routineId: string,
    date: string,
    options?: { force?: boolean }
  ): { ok: boolean; count: number; alreadyApplied?: boolean; routineName?: string } {
    const routine = routinesData.routines[routineId];
    if (!routine || routine.tasks.length === 0) {
      return { ok: false, count: 0 };
    }

    const currentDay = getDay(date);
    const already = isRoutineAppliedOnDate(routineId, currentDay.tasks);

    if (already && !options?.force) {
      return { ok: false, count: 0, alreadyApplied: true, routineName: routine.name };
    }

    const tasksToAdd = routine.tasks.map((rt) => ({
      title: rt.title,
      priority: rt.priority,
      important: Boolean(rt.important),
      category: rt.category,
      notes: rt.notes,
      dueTime: rt.dueTime,
      reminderMinutes: rt.reminderMinutes,
      durationTargetMinutes: rt.durationTargetMinutes ?? null,
      quantityTarget: rt.quantityTarget ?? null,
      quantityUnit: rt.quantityUnit ?? "",
      quantityStep: rt.quantityStep ?? 1,
      routineId: routine.id,
      routineTaskId: rt.id
    }));

    addTasks(date, tasksToAdd);
    return { ok: true, count: tasksToAdd.length, routineName: routine.name };
  }

  const value: RoutinesContextValue = {
    routines: routinesList,
    routinesData,
    getRoutine,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    replaceAllRoutines,
    isRoutineAppliedOnDate,
    applyRoutineToDate
  };

  return <RoutinesContext.Provider value={value}>{children}</RoutinesContext.Provider>;
}

export function useRoutines(): RoutinesContextValue {
  const ctx = useContext(RoutinesContext);
  if (!ctx) throw new Error("useRoutines must be used within a RoutinesProvider");
  return ctx;
}
