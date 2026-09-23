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
  markReminderDelivered,
  showOverdueNotification,
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

    // Check reminders regardless of browser permission so in-app Notification Center records are created
    function checkReminders() {
      const today = todayStr();
      const dayData = resolveDayData(today, appData.days[today], appData.recurringTasks ?? []);
      const now = new Date();
      const currentMs = now.getTime();

      for (const task of dayData.tasks) {
        // Suppress reminders if task is already completed (including recurring completions for today)
        if (task.completed) continue;
        if (!task.dueTime || !isValidTimeString(task.dueTime)) continue;

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
        const dueMs = dueDateTime.getTime();

        const GRACE_TRANSITION_MS = 5 * 60 * 1000; // 5 minute transition window between Due and Overdue
        const MAX_OVERDUE_WINDOW_MS = 120 * 60 * 1000; // Tasks up to 2 hours overdue

        // 1. Scheduled / Due reminder window check
        if (task.reminderMinutes !== null && task.reminderMinutes !== undefined) {
          const triggerTimeMs = dueMs - task.reminderMinutes * 60 * 1000;
          const dueWindowEndMs = dueMs + GRACE_TRANSITION_MS;

          // Only fire Task Due reminder during the scheduled-to-grace window (before overdue transition)
          if (currentMs >= triggerTimeMs && currentMs < dueWindowEndMs) {
            const key = createReminderKey(task.id, today, task.dueTime, task.reminderMinutes);
            if (!hasReminderBeenDelivered(key)) {
              void showTaskReminderNotification(task, today);
            }
          }
        }

        // 2. Overdue transition check
        // An incomplete task only transitions to "overdue" AFTER the grace transition window has elapsed past dueMs!
        const overdueStartMs = dueMs + GRACE_TRANSITION_MS;
        const overdueEndMs = dueMs + MAX_OVERDUE_WINDOW_MS;

        if (currentMs >= overdueStartMs && currentMs <= overdueEndMs) {
          // If the task transitioned into overdue, ensure any un-fired due reminder is consumed
          // so it cannot fire alongside or after overdue.
          if (task.reminderMinutes !== null && task.reminderMinutes !== undefined) {
            const dueKey = createReminderKey(task.id, today, task.dueTime, task.reminderMinutes);
            if (!hasReminderBeenDelivered(dueKey)) {
              markReminderDelivered(dueKey);
            }
          }

          const overdueKey = `overdue_${task.id}_${today}_${task.dueTime}`;
          if (!hasReminderBeenDelivered(overdueKey)) {
            markReminderDelivered(overdueKey);
            void showOverdueNotification(task, today);
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
