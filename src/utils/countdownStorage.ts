import type { Countdown, CountdownsData } from "../types";

export const STORAGE_KEY_COUNTDOWNS = "dailyCheck.countdowns.v1";
const LEGACY_STORAGE_KEY = "dailyCheck.countdownGoals.v1";

function emptyData(): CountdownsData {
  return {
    version: 1,
    countdowns: {}
  };
}

function sanitizeCountdown(raw: unknown): Countdown | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<Countdown>;

  if (typeof c.id !== "string" || !c.id.trim()) return null;
  if (typeof c.title !== "string" || !c.title.trim()) return null;
  if (typeof c.targetDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(c.targetDate)) return null;

  const validModes = ["countdown", "countup"] as const;
  const mode = validModes.includes(c.mode as any) ? (c.mode as any) : "countdown";

  const validDisplayModes = ["days", "weeksDays", "hours"] as const;
  const displayMode = validDisplayModes.includes(c.displayMode as any)
    ? (c.displayMode as any)
    : "days";

  return {
    id: c.id,
    title: c.title.trim(),
    icon: typeof c.icon === "string" && c.icon.trim() ? c.icon.trim() : "🎯",
    targetDate: c.targetDate,
    targetTime: typeof c.targetTime === "string" && /^\d{2}:\d{2}$/.test(c.targetTime) ? c.targetTime : undefined,
    allDay: c.allDay !== false,
    mode,
    displayMode,
    countWorkingDays: Boolean(c.countWorkingDays),
    showOnToday: Boolean(c.showOnToday),
    pinned: Boolean(c.pinned),
    recurring:
      c.recurring && typeof c.recurring === "object" && typeof c.recurring.frequency === "string"
        ? {
            frequency: (["daily", "weekly", "monthly", "yearly"].includes(c.recurring.frequency)
              ? c.recurring.frequency
              : "yearly") as any,
            interval: typeof c.recurring.interval === "number" && c.recurring.interval > 0 ? c.recurring.interval : 1,
            endDate: typeof c.recurring.endDate === "string" ? c.recurring.endDate : undefined
          }
        : undefined,
    reminders: Array.isArray(c.reminders)
      ? c.reminders.filter((r) => r && typeof r.id === "string")
      : [],
    notes: typeof c.notes === "string" ? c.notes : undefined,
    createdAt: typeof c.createdAt === "string" ? c.createdAt : new Date().toISOString(),
    updatedAt: typeof c.updatedAt === "string" ? c.updatedAt : new Date().toISOString()
  };
}

/**
 * Loads countdowns from isolated dailyCheck.countdowns.v1 storage.
 * Automatically migrates legacy countdownGoals once if found.
 */
export function loadCountdowns(): CountdownsData {
  if (typeof window === "undefined" || !window.localStorage) {
    return emptyData();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_COUNTDOWNS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.countdowns && typeof parsed.countdowns === "object") {
        const clean: Record<string, Countdown> = {};
        for (const [id, item] of Object.entries(parsed.countdowns)) {
          const sanitized = sanitizeCountdown(item);
          if (sanitized) clean[id] = sanitized;
        }
        return { version: 1, countdowns: clean };
      }
    }

    // Check for legacy migration
    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      try {
        const legacyParsed = JSON.parse(legacyRaw);
        if (legacyParsed && legacyParsed.goals && typeof legacyParsed.goals === "object") {
          const migrated: Record<string, Countdown> = {};
          const primaryId = legacyParsed.primaryGoalId;

          for (const [id, g] of Object.entries(legacyParsed.goals) as [string, any][]) {
            if (g && typeof g.title === "string" && typeof g.targetDate === "string") {
              migrated[id] = {
                id,
                title: g.title,
                icon: g.icon || "🎯",
                targetDate: g.targetDate,
                allDay: true,
                mode: "countdown",
                displayMode: "days",
                countWorkingDays: false,
                showOnToday: id === primaryId,
                pinned: id === primaryId,
                reminders: [{ id: "rem-default", type: "same_day", daysBefore: 0, enabled: true }],
                notes: g.description || undefined,
                createdAt: new Date(g.createdAt || Date.now()).toISOString(),
                updatedAt: new Date().toISOString()
              };
            }
          }

          const result: CountdownsData = { version: 1, countdowns: migrated };
          saveCountdowns(result);
          // Clean legacy key
          window.localStorage.removeItem(LEGACY_STORAGE_KEY);
          return result;
        }
      } catch {
        // Ignore legacy parse error
      }
    }

    return emptyData();
  } catch (err) {
    console.error("Failed to load countdowns:", err);
    return emptyData();
  }
}

/**
 * Saves Countdowns to localStorage under dailyCheck.countdowns.v1.
 */
export function saveCountdowns(data: CountdownsData): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY_COUNTDOWNS, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error("Failed to save countdowns:", err);
    return false;
  }
}
