import type { CountdownGoal, CountdownGoalsData } from "../types";
import { CURRENT_COUNTDOWN_VERSION } from "../types";
import { isValidDateStr } from "./dateUtils";

// Deliberately a separate key from `dailyCheck.data` (tasks) — countdown
// goals must never be mixed with, or affect, task/day storage or stats.
const STORAGE_KEY = "dailyCheck.countdownGoals.v1";

function emptyData(): CountdownGoalsData {
  return { version: CURRENT_COUNTDOWN_VERSION, goals: {}, primaryGoalId: null };
}

function sanitizeGoals(raw: unknown): Record<string, CountdownGoal> {
  const clean: Record<string, CountdownGoal> = {};
  if (!raw || typeof raw !== "object") return clean;

  Object.entries(raw as Record<string, unknown>).forEach(([id, value]) => {
    if (!value || typeof value !== "object") return;
    const g = value as Partial<CountdownGoal>;
    if (typeof g.id !== "string" || g.id !== id) return;
    if (typeof g.title !== "string" || !g.title.trim()) return;
    if (!isValidDateStr(g.startDate as string) || !isValidDateStr(g.targetDate as string)) return;
    if ((g.targetDate as string) < (g.startDate as string)) return;

    clean[id] = {
      id,
      title: g.title,
      startDate: g.startDate as string,
      targetDate: g.targetDate as string,
      icon: typeof g.icon === "string" && g.icon ? g.icon : "\uD83C\uDFAF",
      description: typeof g.description === "string" ? g.description : "",
      createdAt: typeof g.createdAt === "number" ? g.createdAt : Date.now()
    };
  });

  return clean;
}

export function loadCountdownGoals(): CountdownGoalsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyData();

    const goals = sanitizeGoals(parsed.goals);
    const primaryGoalId =
      typeof parsed.primaryGoalId === "string" && goals[parsed.primaryGoalId] ? parsed.primaryGoalId : null;

    return { version: CURRENT_COUNTDOWN_VERSION, goals, primaryGoalId };
  } catch (e) {
    console.error("Daily Check: could not read countdown goals. Backing up corrupted data.", e);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        localStorage.setItem(`dailyCheck.countdownGoals.corrupted_recovery.${Date.now()}`, raw);
      }
    } catch {
      // Ignore fallback error
    }
    return emptyData();
  }
}

export function saveCountdownGoals(data: CountdownGoalsData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Daily Check: could not save countdown goals.", e);
    return false;
  }
}
