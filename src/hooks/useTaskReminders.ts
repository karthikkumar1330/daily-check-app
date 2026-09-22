import { useEffect } from "react";
import type { AppData } from "../types";
import { parseDateStr, todayStr } from "../utils/dateUtils";
import { resolveDayData } from "../utils/recurrenceUtils";
import {
  areNotificationsEnabledByUser,
  cleanupOldReminderRecords,
  createReminderKey,
  getNotificationPermission,
  hasReminderBeenDelivered,
  showTaskReminderNotification
} from "../utils/notificationUtils";
import { isValidTimeString, parseTimeString } from "../utils/scheduleUtils";

/**
 * Lightweight centralized scheduler for task reminders.
 * Runs a single 30-second interval to check if any tasks scheduled for today
 * have reached their reminder window.
 *
 * Background Limitation Notice:
 * Browser PWAs only execute JavaScript when the app tab or service worker is active.
 * Notification delivery in background is best-effort and will not execute if the browser
 * is terminated by the operating system.
 */
export function useTaskReminders(appData: AppData) {
  useEffect(() => {
    // Run cleanup on legacy records deferred after initial mount
    const cleanupTimer = setTimeout(() => {
      cleanupOldReminderRecords(7);
    }, 3000);

    // Only run active checking if notifications are supported, granted, and enabled by user
    if (getNotificationPermission() !== "granted" || !areNotificationsEnabledByUser()) {
      return () => clearTimeout(cleanupTimer);
    }

    function checkReminders() {
      const today = todayStr();
      const dayData = resolveDayData(today, appData.days[today], appData.recurringTasks ?? []);
      const now = new Date();
      const currentMs = now.getTime();

      for (const task of dayData.tasks) {
        // Suppress reminders if task is already completed (including recurring completions for today)
        if (task.completed) continue;

        if (!task.dueTime || !isValidTimeString(task.dueTime)) continue;
        if (task.reminderMinutes === null || task.reminderMinutes === undefined) continue;

        const parsedTime = parseTimeString(task.dueTime);
        if (!parsedTime) continue;

        const dateObj = parseDateStr(today);
        const dueDateTime = new Date(
          dateObj.getFullYear(),
          dateObj.getMonth(),
          dateObj.getDate(),
          parsedTime.hours,
          parsedTime.minutes,
          0,
          0
        );

        const triggerTimeMs = dueDateTime.getTime() - task.reminderMinutes * 60 * 1000;
        // Acceptable late delivery window: from trigger time up to 15 minutes after trigger time,
        // or up to 5 minutes after due time (whichever is greater), but not indefinitely.
        const maxWindowMs = Math.max(triggerTimeMs + 15 * 60 * 1000, dueDateTime.getTime() + 5 * 60 * 1000);

        if (currentMs >= triggerTimeMs && currentMs <= maxWindowMs) {
          const key = createReminderKey(task.id, today, task.dueTime, task.reminderMinutes);
          if (!hasReminderBeenDelivered(key)) {
            void showTaskReminderNotification(task, today);
          }
        }
      }
    }

    // Run check immediately on mount/data change
    checkReminders();

    // Single lightweight interval (30 seconds)
    const interval = setInterval(checkReminders, 30000);
    return () => {
      clearTimeout(cleanupTimer);
      clearInterval(interval);
    };
  }, [appData]);
}
