import type { Task } from "../types";
import type { NotificationActionType, NotificationRecord, NotificationType } from "../types/notification";
import {
  addNotificationRecord,
  buildNotificationId,
  setPendingDeepLink
} from "./notificationStorage";
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
 * Displays a local browser or service worker notification for a scheduled task
 * and records it deterministically in the in-app Notification Center.
 */
export async function showTaskReminderNotification(
  task: Task,
  dateStr: string
): Promise<boolean> {
  if (!task.dueTime || task.reminderMinutes === null || task.reminderMinutes === undefined) {
    return false;
  }

  const reminderKey = createReminderKey(task.id, dateStr, task.dueTime, task.reminderMinutes);
  if (hasReminderBeenDelivered(reminderKey)) {
    return false;
  }

  // Mark delivered immediately to prevent duplicate runs
  markReminderDelivered(reminderKey);

  const timeFormatted = formatTime(task.dueTime);
  const timingText =
    task.reminderMinutes === 0
      ? `is due now (${timeFormatted})`
      : `is due in ${task.reminderMinutes} minutes (${timeFormatted})`;

  const taskType: "checklist" | "duration" | "quantity" = task.durationTargetMinutes
    ? "duration"
    : task.quantityTarget
    ? "quantity"
    : "checklist";

  const notifType: NotificationType = task.durationTargetMinutes
    ? "duration_reminder"
    : task.quantityTarget
    ? "quantity_reminder"
    : task.recurrence
    ? "recurring_task"
    : "task_due";

  const actionType: NotificationActionType =
    taskType === "duration" || taskType === "quantity" ? "open_task_details" : "open_task";

  const targetUrl = `/today?date=${encodeURIComponent(dateStr)}&taskId=${encodeURIComponent(
    task.id
  )}&action=${encodeURIComponent(actionType)}`;

  // 1. Record into in-app Notification Center (independent of OS permission)
  const notifRecordId = buildNotificationId(
    notifType,
    task.id,
    dateStr,
    `${task.dueTime}_${task.reminderMinutes}`
  );

  const notifRecord: NotificationRecord = {
    id: notifRecordId,
    type: notifType,
    title: `Task Reminder: ${task.title}`,
    body: `${task.title} ${timingText}.`,
    createdAt: new Date().toISOString(),
    read: false,
    taskId: task.id,
    dateStr,
    action: { type: actionType },
    metadata: {
      taskType,
      dueTime: task.dueTime,
      category: task.category,
      priority: task.priority
    }
  };

  addNotificationRecord(notifRecord);

  // Store pending deep link as backup
  setPendingDeepLink({
    url: targetUrl,
    taskId: task.id,
    dateStr,
    action: { type: actionType }
  });

  // 2. Dispatch OS/browser notification if granted and enabled
  const notifStatus = getNotificationPermission();
  if (notifStatus !== "granted" || !areNotificationsEnabledByUser()) {
    return false;
  }

  const title = `Task Reminder: ${task.title}`;
  const options: NotificationOptions = {
    body: `${task.title} ${timingText}.`,
    icon: "/icons/icon-192.png",
    badge: "/icons/favicon-16.png",
    tag: `task-reminder-${reminderKey}`,
    data: {
      url: targetUrl,
      taskId: task.id,
      dateStr,
      action: { type: actionType },
      metadata: {
        taskType,
        dueTime: task.dueTime
      }
    }
  };

  try {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && "showNotification" in registration) {
        await registration.showNotification(title, options);
        return true;
      }
    }
    // Fallback to standard window Notification
    const windowNotif = new Notification(title, options);
    windowNotif.onclick = (e) => {
      e.preventDefault();
      window.focus();
      window.location.href = targetUrl;
    };
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
 * Also records a test entry in Notification Center.
 */
export async function sendTestNotification(): Promise<boolean> {
  const targetUrl = "/notifications";

  // Record in in-app Notification Center
  const record: NotificationRecord = {
    id: buildNotificationId("general", undefined, undefined, `test_${Date.now()}`),
    type: "general",
    title: "Daily Check: Test Notification",
    body: "Notifications and Notification Center are working properly.",
    createdAt: new Date().toISOString(),
    read: false,
    action: { type: "open_notifications" }
  };
  addNotificationRecord(record);

  const notifStatus = getNotificationPermission();
  if (notifStatus !== "granted") {
    return true; // Added to in-app notification center
  }

  const title = "Daily Check: Test Notification";
  const options: NotificationOptions = {
    body: "Notifications and Notification Center are working properly.",
    icon: "/icons/icon-192.png",
    badge: "/icons/favicon-16.png",
    tag: `test-notification-${Date.now()}`,
    data: {
      url: targetUrl,
      action: { type: "open_notifications" }
    }
  };

  try {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && "showNotification" in registration) {
        await registration.showNotification(title, options);
        return true;
      }
    }
    const windowNotif = new Notification(title, options);
    windowNotif.onclick = (e) => {
      e.preventDefault();
      window.focus();
      window.location.href = targetUrl;
    };
    return true;
  } catch (err) {
    console.warn("Daily Check: test notification display prevented by browser", err);
    return false;
  }
}

/**
 * Records and displays an overdue notification for a task whose due time has passed.
 */
export async function showOverdueNotification(
  task: Task,
  dateStr: string
): Promise<boolean> {
  const timeFormatted = formatTime(task.dueTime || "");
  const notifType: NotificationType = "task_overdue";
  const actionType: NotificationActionType = "open_task";
  const targetUrl = `/today?date=${encodeURIComponent(dateStr)}&taskId=${encodeURIComponent(
    task.id
  )}&action=${encodeURIComponent(actionType)}`;

  const notifRecordId = buildNotificationId(
    notifType,
    task.id,
    dateStr,
    task.dueTime || "overdue"
  );

  const record: NotificationRecord = {
    id: notifRecordId,
    type: notifType,
    title: `Task Overdue: ${task.title}`,
    body: `"${task.title}" was due at ${timeFormatted} and is now overdue.`,
    createdAt: new Date().toISOString(),
    read: false,
    taskId: task.id,
    dateStr,
    action: { type: actionType },
    metadata: {
      dueTime: task.dueTime,
      category: task.category,
      priority: task.priority
    }
  };

  addNotificationRecord(record);

  setPendingDeepLink({
    url: targetUrl,
    taskId: task.id,
    dateStr,
    action: { type: actionType }
  });

  const notifStatus = getNotificationPermission();
  if (notifStatus !== "granted" || !areNotificationsEnabledByUser()) {
    return false;
  }

  const title = `⚠️ Overdue: ${task.title}`;
  const options: NotificationOptions = {
    body: `Task was due at ${timeFormatted}.`,
    icon: "/icons/icon-192.png",
    badge: "/icons/favicon-16.png",
    tag: `task-overdue-${task.id}-${dateStr}`,
    data: {
      url: targetUrl,
      taskId: task.id,
      dateStr,
      action: { type: actionType }
    }
  };

  try {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && "showNotification" in registration) {
        await registration.showNotification(title, options);
        return true;
      }
    }
    const windowNotif = new Notification(title, options);
    windowNotif.onclick = (e) => {
      e.preventDefault();
      window.focus();
      window.location.href = targetUrl;
    };
    return true;
  } catch (err) {
    return false;
  }
}


