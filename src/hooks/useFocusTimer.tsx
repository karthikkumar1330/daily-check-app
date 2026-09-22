import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useTasks } from "./useTasks";

export interface FocusSession {
  taskId: string;
  taskTitle: string;
  dateStr: string;
  targetMinutes: number;
  initialCompletedMinutes: number;
  startedAt: number | null;
  accumulatedMs: number;
  isRunning: boolean;
  isMinimized?: boolean;
}

interface FocusTimerContextValue {
  session: FocusSession | null;
  isRunning: boolean;
  totalElapsedMs: number;
  remainingSeconds: number;
  pct: number;
  currentCompletedMinutes: number;
  isTargetReached: boolean;
  startFocus: (
    task: { id: string; title: string; durationTargetMinutes?: number | null; durationCompletedMinutes?: number | null; focusDate?: string | null },
    dateStr: string
  ) => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  stopFocus: () => void;
  addQuickMinutes: (mins: number) => void;
  toggleMinimized: () => void;
}

const STORAGE_KEY = "dailyCheck.activeFocusTimer";

const FocusTimerContext = createContext<FocusTimerContextValue | null>(null);

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const { setTaskDurationCompleted, logTaskDuration, toggleFocus } = useTasks();
  const [session, setSession] = useState<FocusSession | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.taskId === "string" && typeof parsed.targetMinutes === "number") {
        return parsed as FocusSession;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [tick, setTick] = useState(0);
  const lastSyncRef = useRef<number>(0);
  const celebratedRef = useRef<boolean>(false);

  // Save session changes to localStorage
  useEffect(() => {
    try {
      if (!session) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      }
    } catch {
      // ignore
    }
  }, [session]);

  // Compute live elapsed ms
  const runningMs = session && session.isRunning && session.startedAt ? Math.max(0, Date.now() - session.startedAt) : 0;
  const totalElapsedMs = (session?.accumulatedMs ?? 0) + runningMs;
  const elapsedMinutes = Math.floor(totalElapsedMs / 60000);

  const targetMinutes = session?.targetMinutes ?? 0;
  const initialCompleted = session?.initialCompletedMinutes ?? 0;
  const currentCompletedMinutes = Math.min(targetMinutes, initialCompleted + elapsedMinutes);
  const remainingSeconds = Math.max(
    0,
    targetMinutes > 0 ? (targetMinutes - initialCompleted) * 60 - Math.floor(totalElapsedMs / 1000) : 0
  );
  const isTargetReached = targetMinutes > 0 && currentCompletedMinutes >= targetMinutes;
  const pct = targetMinutes > 0 ? Math.min(100, Math.round((currentCompletedMinutes / targetMinutes) * 100)) : 0;

  // Periodic tick and task synchronization
  useEffect(() => {
    if (!session || !session.isRunning) return;

    const interval = setInterval(() => {
      setTick((t) => (t + 1) % 10000);

      // Sync progress to task every 10 seconds or when target reached
      const now = Date.now();
      if (now - lastSyncRef.current >= 10000 || isTargetReached) {
        lastSyncRef.current = now;
        const res = setTaskDurationCompleted(session.dateStr, session.taskId, currentCompletedMinutes);
        if (isTargetReached && !celebratedRef.current) {
          celebratedRef.current = true;
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            try {
              navigator.vibrate(20);
            } catch {}
          }
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("dailyCheck:taskCelebration", {
                detail: {
                  taskId: session.taskId,
                  text: "🎯 Target reached!",
                  sub: `${Math.round(session.targetMinutes / 60 >= 1 ? session.targetMinutes / 60 : session.targetMinutes)}${session.targetMinutes >= 60 ? "h" : "m"} complete`
                }
              })
            );
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session, currentCompletedMinutes, isTargetReached, setTaskDurationCompleted]);

  function startFocus(
    task: { id: string; title: string; durationTargetMinutes?: number | null; durationCompletedMinutes?: number | null; focusDate?: string | null },
    dateStr: string
  ) {
    const target = task.durationTargetMinutes && task.durationTargetMinutes > 0 ? task.durationTargetMinutes : 60;
    const initial = Math.min(target, Math.max(0, task.durationCompletedMinutes || 0));

    // Ensure it's in Today's focus if on current date
    if (task.focusDate !== dateStr) {
      toggleFocus(dateStr, task.id);
    }

    celebratedRef.current = initial >= target;

    const newSession: FocusSession = {
      taskId: task.id,
      taskTitle: task.title,
      dateStr,
      targetMinutes: target,
      initialCompletedMinutes: initial,
      startedAt: Date.now(),
      accumulatedMs: 0,
      isRunning: true,
      isMinimized: false
    };
    lastSyncRef.current = Date.now();
    setSession(newSession);
  }

  function pauseFocus() {
    if (!session || !session.isRunning) return;
    const currentRun = session.startedAt ? Math.max(0, Date.now() - session.startedAt) : 0;
    const newAccumulated = session.accumulatedMs + currentRun;
    const newlyCompleted = Math.min(
      session.targetMinutes,
      session.initialCompletedMinutes + Math.floor(newAccumulated / 60000)
    );

    // Sync to task right away
    setTaskDurationCompleted(session.dateStr, session.taskId, newlyCompleted);

    setSession({
      ...session,
      startedAt: null,
      accumulatedMs: newAccumulated,
      isRunning: false
    });
  }

  function resumeFocus() {
    if (!session || session.isRunning) return;
    setSession({
      ...session,
      startedAt: Date.now(),
      isRunning: true
    });
    lastSyncRef.current = Date.now();
  }

  function stopFocus() {
    if (!session) return;
    // Flush final completed minutes
    setTaskDurationCompleted(session.dateStr, session.taskId, currentCompletedMinutes);
    setSession(null);
  }

  function addQuickMinutes(mins: number) {
    if (!session || mins <= 0) return;
    logTaskDuration(session.dateStr, session.taskId, mins);
    setSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        initialCompletedMinutes: Math.min(prev.targetMinutes, prev.initialCompletedMinutes + mins)
      };
    });
  }

  function toggleMinimized() {
    setSession((prev) => (prev ? { ...prev, isMinimized: !prev.isMinimized } : null));
  }

  const value: FocusTimerContextValue = {
    session,
    isRunning: Boolean(session?.isRunning),
    totalElapsedMs,
    remainingSeconds,
    pct,
    currentCompletedMinutes,
    isTargetReached,
    startFocus,
    pauseFocus,
    resumeFocus,
    stopFocus,
    addQuickMinutes,
    toggleMinimized
  };

  return <FocusTimerContext.Provider value={value}>{children}</FocusTimerContext.Provider>;
}

export function useFocusTimer(): FocusTimerContextValue {
  const ctx = useContext(FocusTimerContext);
  if (!ctx) throw new Error("useFocusTimer must be used within a FocusTimerProvider");
  return ctx;
}
