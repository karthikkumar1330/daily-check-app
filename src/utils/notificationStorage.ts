import type {
  NotificationPreferences,
  NotificationRecord,
  NotificationType
} from "../types/notification";

export const NOTIFICATIONS_STORAGE_KEY = "dailyCheck.notifications.v1";
export const NOTIFICATIONS_PREFS_KEY = "dailyCheck.notificationPreferences.v1";
export const PENDING_DEEP_LINK_KEY = "dailyCheck.pendingDeepLink";
const MAX_NOTIFICATIONS_HISTORY = 150;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  centerEnabled: true,
  taskDue: true,
  taskOverdue: true,
  recurringTask: true,
  durationReminder: true,
  quantityReminder: true,
  focusReminder: true
};

/**
 * Builds a deterministic notification ID to prevent duplicate records
 * when the app refreshes, background intervals re-run, or components remount.
 */
export function buildNotificationId(
  type: NotificationType,
  taskId?: string,
  dateStr?: string,
  triggerKey?: string | number
): string {
  if (taskId && dateStr) {
    return `notif_${type}_${taskId}_${dateStr}_${triggerKey !== undefined ? triggerKey : "0"}`;
  }
  return `notif_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Loads notification preferences from localStorage with fallback defaults.
 */
export function loadNotificationPreferences(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_PREFS_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_NOTIFICATION_PREFERENCES };
    return {
      centerEnabled: parsed.centerEnabled !== false,
      taskDue: parsed.taskDue !== false,
      taskOverdue: parsed.taskOverdue !== false,
      recurringTask: parsed.recurringTask !== false,
      durationReminder: parsed.durationReminder !== false,
      quantityReminder: parsed.quantityReminder !== false,
      focusReminder: parsed.focusReminder !== false
    };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

/**
 * Persists notification preferences to localStorage.
 */
export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  try {
    localStorage.setItem(NOTIFICATIONS_PREFS_KEY, JSON.stringify(prefs));
    dispatchNotificationsEvent();
  } catch {
    // Ignore storage errors
  }
}

/**
 * Loads all notification history from local storage.
 * Safely handles corrupted or legacy records.
 */
export function loadNotifications(): NotificationRecord[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const clean: NotificationRecord[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.body === "string"
      ) {
        clean.push({
          id: item.id,
          type: item.type || "general",
          title: item.title,
          body: item.body,
          createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
          read: Boolean(item.read),
          taskId: typeof item.taskId === "string" ? item.taskId : undefined,
          dateStr: typeof item.dateStr === "string" ? item.dateStr : undefined,
          action: item.action && typeof item.action.type === "string" ? item.action : undefined,
          metadata: item.metadata && typeof item.metadata === "object" ? item.metadata : undefined
        });
      }
    }
    return clean;
  } catch (err) {
    console.error("Daily Check: failed to load notification records", err);
    return [];
  }
}

/**
 * Persists notification records to local storage.
 */
export function saveNotifications(records: NotificationRecord[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(records));
    dispatchNotificationsEvent();
  } catch {
    // Ignore storage errors
  }
}

/**
 * Dispatches a lightweight custom window event so all in-app components
 * (Header badge, Notification Center, Settings) synchronize immediately.
 */
function dispatchNotificationsEvent(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dailycheck:notifications_updated"));
  }
}

/**
 * Adds a new notification to history with deduplication and history limits.
 * Returns true if added, false if ignored (e.g. center disabled or duplicate ID).
 */
export function addNotificationRecord(record: NotificationRecord): boolean {
  const prefs = loadNotificationPreferences();
  if (!prefs.centerEnabled) {
    return false;
  }

  // Check category preferences
  if (record.type === "task_due" && !prefs.taskDue) return false;
  if (record.type === "task_overdue" && !prefs.taskOverdue) return false;
  if (record.type === "recurring_task" && !prefs.recurringTask) return false;
  if (record.type === "duration_reminder" && !prefs.durationReminder) return false;
  if (record.type === "quantity_reminder" && !prefs.quantityReminder) return false;
  if (record.type === "focus_reminder" && !prefs.focusReminder) return false;

  const current = loadNotifications();
  // Prevent duplicate notification IDs
  if (current.some((n) => n.id === record.id)) {
    return false;
  }

  // Prepend new record and enforce maximum history retention
  const updated = [record, ...current].slice(0, MAX_NOTIFICATIONS_HISTORY);
  saveNotifications(updated);
  return true;
}

/**
 * Marks a specific notification as read.
 */
export function markNotificationAsRead(id: string): void {
  const current = loadNotifications();
  let changed = false;
  const updated = current.map((n) => {
    if (n.id === id && !n.read) {
      changed = true;
      return { ...n, read: true };
    }
    return n;
  });
  if (changed) {
    saveNotifications(updated);
  }
}

/**
 * Marks all notifications as read.
 */
export function markAllNotificationsAsRead(): void {
  const current = loadNotifications();
  const updated = current.map((n) => ({ ...n, read: true }));
  saveNotifications(updated);
}

/**
 * Deletes a single notification from history.
 */
export function deleteNotificationRecord(id: string): void {
  const current = loadNotifications();
  const updated = current.filter((n) => n.id !== id);
  saveNotifications(updated);
}

/**
 * Clears all notification history.
 */
export function clearAllNotificationRecords(): void {
  saveNotifications([]);
}

/**
 * Returns current count of unread notifications.
 */
export function getUnreadNotificationCount(): number {
  const current = loadNotifications();
  return current.filter((n) => !n.read).length;
}

/**
 * Stores a pending deep link in localStorage so cold-launching from closed state
 * can safely consume the intended destination even if query parameters are stripped.
 */
export function setPendingDeepLink(data: {
  url?: string;
  taskId?: string;
  dateStr?: string;
  action?: { type: string };
}): void {
  try {
    localStorage.setItem(PENDING_DEEP_LINK_KEY, JSON.stringify(data));
  } catch {
    // Ignore
  }
}

/**
 * Retrieves and clears any pending deep link.
 */
export function consumePendingDeepLink(): {
  url?: string;
  taskId?: string;
  dateStr?: string;
  action?: { type: string };
} | null {
  try {
    const raw = localStorage.getItem(PENDING_DEEP_LINK_KEY);
    if (!raw) return null;
    localStorage.removeItem(PENDING_DEEP_LINK_KEY);
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
