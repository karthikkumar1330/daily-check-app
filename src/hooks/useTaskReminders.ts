import { useEffect, useRef } from "react";
import type { AppData } from "../types";
import { parseDateStr, todayStr } from "../utils/dateUtils";
import { resolveDayData } from "../utils/recurrenceUtils";
import {
  cleanupOldReminderRecords,
  createReminderKey,
  hasReminderBeenDelivered,
  markReminderDelivered,
  showOverdueNotification,
  showTaskReminderNotification
} from "../utils/notificationUtils";
import { isValidTimeString, parseTimeString } from "../utils/scheduleUtils";

/**
 * High-precision centralized scheduler for task reminders (V14.2).
 *
 * Architecture & Lifecycle Reality:
 * - When the app is in foreground or recently active with live tabs, the scheduler
 *   calculates the exact next notification trigger time and schedules a precise setTimeout
 *   down to the second, backed by lifecycle recovery listeners (visibilitychange, focus,
 *   pageshow, online, and clock ticks).
 * - Background Limitation Notice:
 *   Standard PWA JavaScript timers only run while the browser process or service worker client
 *   is alive. When the operating system suspends or terminates the browser process completely,
 *   client setTimeout loops cannot execute until the user reactivates the app or the OS delivers
 *   a platform push. The recovery listeners immediately evaluate and catch up on overdue / due
 *   transitions as soon as the app regains focus or visibility.
 */
export function useTaskReminders(appData: AppData) {
  const nextTriggerTimerRef = useRef<number | null>(null);
  const fallbackIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Run cleanup on legacy records deferred after initial mount
    const cleanupTimer = setTimeout(() => {
      cleanupOldReminderRecords(7);
    }, 3000);

    function evaluateAndSchedule() {
      // Clear any pending single-shot timer before re-evaluating
      if (nextTriggerTimerRef.current !== null) {
        clearTimeout(nextTriggerTimerRef.current);
        nextTriggerTimerRef.current = null;
      }

      const today = todayStr();
      const dayData = resolveDayData(today, appData.days[today], appData.recurringTasks ?? []);
      const now = new Date();
      const currentMs = now.getTime();

      const GRACE_TRANSITION_MS = 5 * 60 * 1000; // 5 minute transition window between Due and Overdue
      const MAX_OVERDUE_WINDOW_MS = 120 * 60 * 1000; // Tasks up to 2 hours overdue

      let nextEarliestTriggerMs: number | null = null;

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

        // 1. Scheduled / Due reminder window check
        if (task.reminderMinutes !== null && task.reminderMinutes !== undefined) {
          const triggerTimeMs = dueMs - task.reminderMinutes * 60 * 1000;
          const dueWindowEndMs = dueMs + GRACE_TRANSITION_MS;
          const key = createReminderKey(task.id, today, task.dueTime, task.reminderMinutes);

          if (!hasReminderBeenDelivered(key)) {
            if (currentMs >= triggerTimeMs && currentMs < dueWindowEndMs) {
              // Trigger immediately
              void showTaskReminderNotification(task, today);
            } else if (currentMs < triggerTimeMs) {
              // Future due trigger: record earliest upcoming trigger
              if (nextEarliestTriggerMs === null || triggerTimeMs < nextEarliestTriggerMs) {
                nextEarliestTriggerMs = triggerTimeMs;
              }
            }
          }
        }

        // 2. Overdue transition check
        // An incomplete task only transitions to "overdue" AFTER the grace transition window has elapsed past dueMs!
        const overdueStartMs = dueMs + GRACE_TRANSITION_MS;
        const overdueEndMs = dueMs + MAX_OVERDUE_WINDOW_MS;
        const overdueKey = `overdue_${task.id}_${today}_${task.dueTime}`;

        if (!hasReminderBeenDelivered(overdueKey)) {
          if (currentMs >= overdueStartMs && currentMs <= overdueEndMs) {
            // If the task transitioned into overdue, ensure any un-fired due reminder is consumed
            if (task.reminderMinutes !== null && task.reminderMinutes !== undefined) {
              const dueKey = createReminderKey(task.id, today, task.dueTime, task.reminderMinutes);
              if (!hasReminderBeenDelivered(dueKey)) {
                markReminderDelivered(dueKey);
              }
            }

            markReminderDelivered(overdueKey);
            void showOverdueNotification(task, today);
          } else if (currentMs < overdueStartMs) {
            // Future overdue transition: record earliest upcoming overdue time
            if (nextEarliestTriggerMs === null || overdueStartMs < nextEarliestTriggerMs) {
              nextEarliestTriggerMs = overdueStartMs;
            }
          }
        }
      }

      // If we found an upcoming trigger today, schedule a precise timeout
      if (nextEarliestTriggerMs !== null) {
        // Small 200ms offset to guarantee we cross the exact second boundary
        const delayMs = Math.max(200, nextEarliestTriggerMs - currentMs + 200);
        // Cap max setTimeout to 24 hours to prevent 32-bit integer overflow
        const safeDelay = Math.min(delayMs, 24 * 60 * 60 * 1000);
        nextTriggerTimerRef.current = window.setTimeout(() => {
          evaluateAndSchedule();
        }, safeDelay);
      }
    }

    // Run evaluation immediately
    evaluateAndSchedule();

    // Fallback heartbeat (every 30s) as safety net for timer drift or system sleep
    fallbackIntervalRef.current = window.setInterval(evaluateAndSchedule, 30000);

    // Lifecycle event recovery: re-evaluate immediately when user returns to app,
    // window is focused, page restores from BFCache, or network connects
    function handleRecovery() {
      evaluateAndSchedule();
    }

    document.addEventListener("visibilitychange", handleRecovery);
    window.addEventListener("focus", handleRecovery);
    window.addEventListener("pageshow", handleRecovery);
    window.addEventListener("online", handleRecovery);

    return () => {
      clearTimeout(cleanupTimer);
      if (nextTriggerTimerRef.current !== null) {
        clearTimeout(nextTriggerTimerRef.current);
      }
      if (fallbackIntervalRef.current !== null) {
        clearInterval(fallbackIntervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleRecovery);
      window.removeEventListener("focus", handleRecovery);
      window.removeEventListener("pageshow", handleRecovery);
      window.removeEventListener("online", handleRecovery);
    };
  }, [appData]);
}

