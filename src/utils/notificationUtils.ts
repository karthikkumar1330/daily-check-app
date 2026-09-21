import type { Task } from "../types";
import { formatTime } from "./scheduleUtils";

const NOTIFICATIONS_ENABLED_KEY = "dailyCheck.notificationsEnabled";
const NOTIFIED_REMINDERS_STORAGE_KEY = "dailyCheck.notifiedReminders.v1";

export type NotificationSupportStatus = "granted" | "denied" | "default" | "unsupported";

/**
 * Checks whether the Notification API is supported by the current browser environment.
 */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Returns current browser notification permission status.
 */
export function getNotificationPermission(): NotificationSupportStatus {
  if (!isNotificationSupported()) {
    return "unsupported";
  }
  return Notification.permission;
}

/** Backwards-compatible alias */
export const getNotificationSupportStatus = getNotificationPermission;

/**
 * Checks whether user has explicitly enabled notifications in app settings.
 */
export function areNotificationsEnabledByUser(): boolean {
  try {
    const val = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    if (val === null) {
      return typeof Notification !== "undefined" && Notification.permission === "granted";
    }
    return val === "true";
  } catch {
    return false;
  }
}

/**
 * Persists user notification preference toggle in local storage.
 */
export function setNotificationsEnabledByUser(enabled: boolean): void {
  try {
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? "true" : "false");
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Requests browser notification permission.
 * MUST only be invoked in response to explicit user interaction.
 */
export async function requestNotificationPermission(): Promise<NotificationSupportStatus> {
  if (!isNotificationSupported()) {
    return "unsupported";
  }
  try {
    const result = await Notification.requestPermission();
    if (result === "granted") {
      setNotificationsEnabledByUser(true);
    } else if (result === "denied") {
      setNotificationsEnabledByUser(false);
    }
    return result;
  } catch {
    return "denied";
  }
}

/**
 * Deterministic unique key representing a specific task occurrence reminder.
 * Format: taskId_occurrenceDate_dueTime_reminderMinutes
 * Example: "task123_2026-09-21_04:00_15"
 */
export function createReminderKey(
  taskId: string,
  dateStr: string,
  dueTime: string,
  reminderMinutes: number
): string {
  return `${taskId}_${dateStr}_${dueTime}_${reminderMinutes}`;
}

/**
 * Reads the persisted delivered reminders record map from local storage.
 */
function getDeliveredRecords(): Record<string, number> {
  try {
    const raw = localStorage.getItem(NOTIFIED_REMINDERS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, number>;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Saves delivered reminders record map to local storage.
 */
function saveDeliveredRecords(records: Record<string, number>): void {
  try {
    localStorage.setItem(NOTIFIED_REMINDERS_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Checks if a specific reminder key was already delivered.
 */
export function hasReminderBeenDelivered(key: string): boolean {
  const records = getDeliveredRecords();
  return Boolean(records[key]);
}

/**
 * Marks a reminder key as delivered with the current timestamp.
 */
export function markReminderDelivered(key: string): void {
  const records = getDeliveredRecords();
  records[key] = Date.now();
  saveDeliveredRecords(records);
}

/**
 * Clears either a specific reminder delivery record or all records.
 */
export function clearReminderDeliveryRecord(key?: string): void {
  if (!key) {
    try {
      localStorage.removeItem(NOTIFIED_REMINDERS_STORAGE_KEY);
    } catch {
      // Ignore
    }
    return;
  }
  const records = getDeliveredRecords();
  if (records[key]) {
    delete records[key];
    saveDeliveredRecords(records);
  }
}

/**
 * Prunes reminder delivery records older than `olderThanDays` (default 7 days)
 * to prevent unbounded storage growth.
 */
export function cleanupOldReminderRecords(olderThanDays: number = 7): void {
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  const records = getDeliveredRecords();
  let changed = false;
  for (const [k, timestamp] of Object.entries(records)) {
    if (typeof timestamp !== "number" || timestamp < cutoff) {
      delete records[k];
      changed = true;
    }
  }
  if (changed) {
    saveDeliveredRecords(records);
  }
}

/**
 * Displays a local browser or service worker notification for a scheduled task.
 * Note: When the app/browser is closed, local JavaScript execution is suspended by the OS.
 * Background delivery is best-effort when the application or service worker is active.
 */
export async function showTaskReminderNotification(
  task: Task,
  dateStr: string
): Promise<boolean> {
  const notifStatus = getNotificationPermission();
  if (notifStatus !== "granted" || !areNotificationsEnabledByUser()) {
    return false;
  }

  if (!task.dueTime || task.reminderMinutes === null || task.reminderMinutes === undefined) {
    return false;
  }

  const reminderKey = createReminderKey(task.id, dateStr, task.dueTime, task.reminderMinutes);
  if (hasReminderBeenDelivered(reminderKey)) {
    return false;
  }

  const timeFormatted = formatTime(task.dueTime);
  const timingText =
    task.reminderMinutes === 0
      ? `is due now (${timeFormatted})`
      : `is due in ${task.reminderMinutes} minutes (${timeFormatted})`;

  const title = `Task Reminder: ${task.title}`;
  const options: NotificationOptions = {
    body: `${task.title} ${timingText}.`,
    icon: "/icons/icon-192.png",
    badge: "/icons/favicon-16.png",
    tag: `task-reminder-${reminderKey}`
  };

  markReminderDelivered(reminderKey);

  try {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && "showNotification" in registration) {
        await registration.showNotification(title, options);
        return true;
      }
    }
    // Fallback to standard window Notification
    new Notification(title, options);
    return true;
  } catch (err) {
    console.warn("Daily Check: notification display prevented by browser", err);
    return false;
  }
}

/** Backwards-compatible alias */
export async function sendTaskReminderNotification(
  taskId: string,
  taskTitle: string,
  dateStr: string,
  dueTime: string,
  reminderMinutes: number
): Promise<void> {
  const dummyTask: Task = {
    id: taskId,
    title: taskTitle,
    completed: false,
    priority: 2,
    category: "",
    notes: "",
    createdAt: Date.now(),
    completedAt: null,
    order: 0,
    dueTime,
    reminderMinutes: reminderMinutes as 0 | 5 | 15 | 30 | 60
  };
  await showTaskReminderNotification(dummyTask, dateStr);
}

/**
 * Triggers a one-time test notification when permission is granted.
 * Does not store as a task reminder, create fake tasks, or affect streaks/progress.
 */
export async function sendTestNotification(): Promise<boolean> {
  const notifStatus = getNotificationPermission();
  if (notifStatus !== "granted") {
    return false;
  }

  const title = "Daily Check: Test Notification";
  const options: NotificationOptions = {
    body: "Reminders are configured and working properly.",
    icon: "/icons/icon-192.png",
    badge: "/icons/favicon-16.png",
    tag: `test-notification-${Date.now()}`
  };

  try {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && "showNotification" in registration) {
        await registration.showNotification(title, options);
        return true;
      }
    }
    new Notification(title, options);
    return true;
  } catch (err) {
    console.warn("Daily Check: test notification display prevented by browser", err);
    return false;
  }
}
