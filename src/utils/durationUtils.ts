/**
 * Utilities for Duration Tasks & Time Tracking
 */

export interface DurationPreset {
  label: string;
  minutes: number;
}

export const DURATION_PRESETS: DurationPreset[] = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "3 hours", minutes: 180 }
];

export const LOG_TIME_PRESETS = [15, 30, 45, 60];

/**
 * Formats minutes into "Xh YYm" or "XXm"
 * Examples:
 * 180 -> "3h 00m"
 * 120 -> "2h 00m"
 * 90  -> "1h 30m"
 * 45  -> "45m"
 * 0   -> "0m"
 */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || isNaN(minutes) || minutes <= 0) {
    return "0m";
  }
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;

  if (h === 0) {
    return `${m}m`;
  }
  return `${h}h ${m < 10 ? "0" : ""}${m}m`;
}

/**
 * Compact format for badges, e.g. "2h" or "2h 15m" or "45m"
 */
export function formatDurationShort(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || isNaN(minutes) || minutes <= 0) {
    return "0m";
  }
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;

  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Calculates progress percentage (0-100) clamped.
 */
export function calculateDurationPct(
  completedMinutes: number | null | undefined,
  targetMinutes: number | null | undefined
): number {
  if (!targetMinutes || targetMinutes <= 0) return 0;
  const completed = Math.max(0, completedMinutes || 0);
  const pct = Math.round((completed / targetMinutes) * 100);
  return Math.min(100, Math.max(0, pct));
}

/**
 * Formats remaining seconds as "MM:SS" or "HH:MM:SS"
 */
export function formatTimerClock(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (h > 0) {
    return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  }
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}
