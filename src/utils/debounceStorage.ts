import type { AppData } from "../types";
import { saveData } from "./storageUtils";

/**
 * Optimized asynchronous, debounced, and idle-scheduled persistence manager.
 * Ensures fast UI responsiveness by avoiding synchronous full JSON serialization on every keystroke/toggle,
 * while guaranteeing zero data loss via flush on pagehide/visibilitychange.
 */

let pendingData: AppData | null = null;
let lastSerializedData: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let idleCallbackId: number | null = null;

// Ensure page unload/hide flushes pending data
if (typeof window !== "undefined") {
  const flushImmediately = () => {
    flushPendingStorage();
  };

  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushImmediately();
    }
  });

  window.addEventListener("pagehide", flushImmediately);
  window.addEventListener("beforeunload", flushImmediately);
}

/**
 * Synchronously writes pending data to localStorage if any exists.
 */
export function flushPendingStorage(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (idleCallbackId !== null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
    window.cancelIdleCallback(idleCallbackId);
    idleCallbackId = null;
  }

  if (pendingData) {
    try {
      const dataToSave = pendingData;
      pendingData = null;
      saveData(dataToSave);
      lastSerializedData = JSON.stringify(dataToSave);
    } catch (err) {
      console.error("[Storage] Failed to flush pending data:", err);
    }
  }
}

/**
 * Schedules debounced persistence with requestIdleCallback optimization.
 * Defaults to 400ms debounce.
 */
export function scheduleSaveAppData(data: AppData, debounceMs = 400): void {
  pendingData = data;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (idleCallbackId !== null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
    window.cancelIdleCallback(idleCallbackId);
    idleCallbackId = null;
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;

    const performSave = () => {
      if (!pendingData) return;
      const current = pendingData;
      pendingData = null;

      try {
        const serialized = JSON.stringify(current);
        // Skip duplicate write if identical to last save
        if (serialized === lastSerializedData) {
          return;
        }
        saveData(current);
        lastSerializedData = serialized;
      } catch (err) {
        console.error("[Storage] Debounced save failed:", err);
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleCallbackId = window.requestIdleCallback(
        () => {
          idleCallbackId = null;
          performSave();
        },
        { timeout: 1000 }
      );
    } else {
      performSave();
    }
  }, debounceMs);
}

