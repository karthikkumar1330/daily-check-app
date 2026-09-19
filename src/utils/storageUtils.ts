import type { AppData, DayData, ThemePreference } from "../types";
import { CURRENT_DATA_VERSION } from "../types";
import { isValidDateStr } from "./dateUtils";

const STORAGE_KEY = "dailyCheck.data";

function emptyAppData(): AppData {
  return { version: CURRENT_DATA_VERSION, days: {}, theme: "auto" };
}

/**
 * Sanitizes a days map from untrusted/parsed JSON, dropping anything
 * malformed rather than throwing, so one bad record can't crash the app.
 */
function sanitizeDays(raw: unknown): Record<string, DayData> {
  const clean: Record<string, DayData> = {};
  if (!raw || typeof raw !== "object") return clean;

  Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
    if (!isValidDateStr(key)) return;
    if (!value || typeof value !== "object") return;
    const d = value as Partial<DayData>;
    if (!Array.isArray(d.tasks)) return;

    const tasks = d.tasks.filter((t): t is DayData["tasks"][number] => {
      return (
        !!t &&
        typeof t === "object" &&
        typeof (t as any).id === "string" &&
        typeof (t as any).title === "string" &&
        typeof (t as any).completed === "boolean"
      );
    }).map((t) => ({
      id: t.id,
      title: t.title,
      completed: !!t.completed,
      priority: [1, 2, 3].includes((t as any).priority) ? (t as any).priority : 2,
      category: typeof (t as any).category === "string" ? (t as any).category : "",
      notes: typeof (t as any).notes === "string" ? (t as any).notes : "",
      createdAt: typeof (t as any).createdAt === "number" ? (t as any).createdAt : Date.now(),
      completedAt: typeof (t as any).completedAt === "number" ? (t as any).completedAt : null,
      order: typeof (t as any).order === "number" ? (t as any).order : Date.now()
    }));

    clean[key] = {
      date: key,
      tasks,
      createdAt: typeof d.createdAt === "number" ? d.createdAt : Date.now(),
      updatedAt: typeof d.updatedAt === "number" ? d.updatedAt : Date.now()
    };
  });

  return clean;
}

/**
 * Migration system: each function upgrades data from its key version to key+1.
 * Add new migrations here as the schema evolves; never delete user data,
 * only transform it forward.
 */
const migrations: Record<number, (data: any) => any> = {
  // Example for the future:
  // 1: (data) => ({ ...data, version: 2, /* new fields */ }),
};

function migrate(data: any): AppData {
  let current = data;
  let safety = 0;
  while (current.version < CURRENT_DATA_VERSION && migrations[current.version] && safety < 50) {
    current = migrations[current.version](current);
    safety++;
  }
  if (current.version !== CURRENT_DATA_VERSION) {
    // Unknown future version or no migration path: keep the data as-is
    // rather than discarding it, just stamp it to the current version.
    current = { ...current, version: CURRENT_DATA_VERSION };
  }
  return current;
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyAppData();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyAppData();

    const withVersion = {
      version: typeof parsed.version === "number" ? parsed.version : 1,
      days: sanitizeDays(parsed.days),
      theme: (["auto", "light", "dark"].includes(parsed.theme) ? parsed.theme : "auto") as ThemePreference
    };

    return migrate(withVersion);
  } catch (e) {
    console.error("Daily Check: could not read stored data, starting fresh.", e);
    return emptyAppData();
  }
}

export function saveData(data: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Daily Check: could not save data.", e);
    return false;
  }
}

/** Triggers a browser download of the full backup as JSON. */
export function exportBackup(data: AppData): void {
  const payload = {
    ...data,
    exportedAt: new Date().toISOString(),
    app: "daily-check"
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "daily-check-backup.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  ok: boolean;
  data?: AppData;
  error?: string;
}

/** Validates and parses a backup file's text content. Never throws. */
export function parseImportFile(text: string): ImportResult {
  const genericError = "Couldn't import this backup. Check that the file is a valid Daily Check backup.";

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: genericError };
  }

  if (!parsed || typeof parsed !== "object" || typeof parsed.days !== "object" || parsed.days === null) {
    return { ok: false, error: genericError };
  }
  if (parsed.version !== undefined && typeof parsed.version !== "number") {
    return { ok: false, error: genericError };
  }

  try {
    const days = sanitizeDays(parsed.days);
    const data: AppData = {
      version: typeof parsed.version === "number" ? parsed.version : CURRENT_DATA_VERSION,
      days,
      theme: (["auto", "light", "dark"].includes(parsed.theme) ? parsed.theme : "auto") as ThemePreference
    };
    return { ok: true, data: migrate(data) };
  } catch {
    return { ok: false, error: genericError };
  }
}
