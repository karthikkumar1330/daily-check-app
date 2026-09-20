import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CountdownGoal, CountdownGoalsData } from "../types";
import { loadCountdownGoals, saveCountdownGoals } from "../utils/countdownStorage";
import { isValidGoalDateRange } from "../utils/countdownUtils";

function uid(): string {
  return "goal_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export interface NewGoalInput {
  title: string;
  startDate: string;
  targetDate: string;
  icon: string;
  description: string;
}

interface CountdownGoalsContextValue {
  goals: CountdownGoal[];
  primaryGoal: CountdownGoal | null;
  createGoal: (input: NewGoalInput) => { ok: boolean; error?: string };
  updateGoal: (id: string, input: NewGoalInput) => { ok: boolean; error?: string };
  deleteGoal: (id: string) => void;
  setPrimaryGoal: (id: string | null) => void;
}

const CountdownGoalsContext = createContext<CountdownGoalsContextValue | null>(null);

function validate(input: NewGoalInput): string | null {
  if (!input.title.trim()) return "Goal name is required.";
  if (!input.startDate) return "Start date is required.";
  if (!input.targetDate) return "Target date is required.";
  if (!isValidGoalDateRange(input.startDate, input.targetDate)) {
    return "Target date must be on or after the start date.";
  }
  return null;
}

export function CountdownGoalsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CountdownGoalsData>(() => loadCountdownGoals());

  useEffect(() => {
    saveCountdownGoals(data);
  }, [data]);

  const goals = (Object.values(data.goals) as CountdownGoal[]).sort((a, b) => a.createdAt - b.createdAt);
  const primaryGoal = data.primaryGoalId ? data.goals[data.primaryGoalId] ?? null : null;

  function createGoal(input: NewGoalInput): { ok: boolean; error?: string } {
    const error = validate(input);
    if (error) return { ok: false, error };

    const id = uid();
    const goal: CountdownGoal = {
      id,
      title: input.title.trim(),
      startDate: input.startDate,
      targetDate: input.targetDate,
      icon: input.icon.trim() || "\uD83C\uDFAF",
      description: input.description.trim(),
      createdAt: Date.now()
    };

    setData((prev) => {
      const wasEmpty = Object.keys(prev.goals).length === 0;
      return {
        ...prev,
        goals: { ...prev.goals, [id]: goal },
        // The first goal a user creates automatically becomes primary.
        primaryGoalId: wasEmpty ? id : prev.primaryGoalId
      };
    });
    return { ok: true };
  }

  function updateGoal(id: string, input: NewGoalInput): { ok: boolean; error?: string } {
    const error = validate(input);
    if (error) return { ok: false, error };

    setData((prev) => {
      const existing = prev.goals[id];
      if (!existing) return prev;
      const updated: CountdownGoal = {
        ...existing,
        title: input.title.trim(),
        startDate: input.startDate,
        targetDate: input.targetDate,
        icon: input.icon.trim() || "\uD83C\uDFAF",
        description: input.description.trim()
      };
      return { ...prev, goals: { ...prev.goals, [id]: updated } };
    });
    return { ok: true };
  }

  function deleteGoal(id: string) {
    setData((prev) => {
      const nextGoals = { ...prev.goals };
      delete nextGoals[id];
      const remainingIds = Object.keys(nextGoals);
      return {
        ...prev,
        goals: nextGoals,
        primaryGoalId:
          prev.primaryGoalId === id ? (remainingIds.length > 0 ? remainingIds[0] : null) : prev.primaryGoalId
      };
    });
  }

  function setPrimaryGoal(id: string | null) {
    setData((prev) => ({ ...prev, primaryGoalId: id }));
  }

  return (
    <CountdownGoalsContext.Provider value={{ goals, primaryGoal, createGoal, updateGoal, deleteGoal, setPrimaryGoal }}>
      {children}
    </CountdownGoalsContext.Provider>
  );
}

export function useCountdownGoals(): CountdownGoalsContextValue {
  const ctx = useContext(CountdownGoalsContext);
  if (!ctx) throw new Error("useCountdownGoals must be used within a CountdownGoalsProvider");
  return ctx;
}
