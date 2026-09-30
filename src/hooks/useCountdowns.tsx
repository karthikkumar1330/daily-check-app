import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { Countdown, CountdownsData } from "../types";
import { loadCountdowns, saveCountdowns } from "../utils/countdownStorage";
import { computeCountdownStatus } from "../utils/countdownUtils";
import { todayStr } from "../utils/dateUtils";

interface CountdownsContextValue {
  countdowns: Countdown[];
  countdownsData: CountdownsData;
  activeCountdowns: Countdown[];
  completedCountdowns: Countdown[];
  featuredCountdown: Countdown | null;
  explicitFeaturedCountdown: Countdown | null;
  todayCountdown: Countdown | null;
  createCountdown: (item: Omit<Countdown, "id" | "createdAt" | "updatedAt">) => Countdown;
  updateCountdown: (id: string, updates: Partial<Countdown>) => void;
  deleteCountdown: (id: string) => void;
  duplicateCountdown: (id: string) => Countdown | null;
  togglePin: (id: string) => void;
  toggleFeatured: (id: string) => void;
  toggleShowOnToday: (id: string) => void;
  replaceAllCountdowns: (data: CountdownsData) => void;
}

const CountdownsContext = createContext<CountdownsContextValue | null>(null);

function generateId(): string {
  return "cd_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
}

export function CountdownsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CountdownsData>(() => loadCountdowns());

  useEffect(() => {
    saveCountdowns(data);
  }, [data]);

  const countdowns = useMemo(() => {
    return Object.values(data.countdowns).sort((a, b) => {
      // Pinned items first
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      // Then soonest target date
      if (a.targetDate !== b.targetDate) return a.targetDate.localeCompare(b.targetDate);
      return a.title.localeCompare(b.title);
    });
  }, [data.countdowns]);

  const today = todayStr();

  const { activeCountdowns, completedCountdowns } = useMemo(() => {
    const active: Countdown[] = [];
    const completed: Countdown[] = [];

    for (const c of countdowns) {
      const status = computeCountdownStatus(c, today);
      if (status.phase === "completed" && c.mode === "countdown") {
        completed.push(c);
      } else {
        active.push(c);
      }
    }

    return { activeCountdowns: active, completedCountdowns: completed };
  }, [countdowns, today]);

  // Explicitly featured countdown (user marked featured === true)
  const explicitFeaturedCountdown = useMemo<Countdown | null>(() => {
    return activeCountdowns.find((c) => c.featured) || null;
  }, [activeCountdowns]);

  // Featured countdown: Explicitly featured item first; if none, pinned item; if none, nearest upcoming active countdown
  const featuredCountdown = useMemo<Countdown | null>(() => {
    if (activeCountdowns.length === 0) return null;
    if (explicitFeaturedCountdown) return explicitFeaturedCountdown;
    const pinned = activeCountdowns.find((c) => c.pinned);
    if (pinned) return pinned;
    return activeCountdowns[0];
  }, [activeCountdowns, explicitFeaturedCountdown]);

  // Today countdown: Must have showOnToday === true. Explicit featured first, then pinned, then nearest active
  const todayCountdown = useMemo<Countdown | null>(() => {
    const candidates = activeCountdowns.filter((c) => c.showOnToday);
    if (candidates.length === 0) return null;
    if (explicitFeaturedCountdown && explicitFeaturedCountdown.showOnToday) {
      return explicitFeaturedCountdown;
    }
    const pinned = candidates.find((c) => c.pinned);
    return pinned || candidates[0];
  }, [activeCountdowns, explicitFeaturedCountdown]);

  const createCountdown = useCallback(
    (item: Omit<Countdown, "id" | "createdAt" | "updatedAt">): Countdown => {
      const now = new Date().toISOString();
      const newCountdown: Countdown = {
        ...item,
        id: generateId(),
        createdAt: now,
        updatedAt: now
      };

      setData((prev) => ({
        ...prev,
        countdowns: {
          ...prev.countdowns,
          [newCountdown.id]: newCountdown
        }
      }));

      return newCountdown;
    },
    []
  );

  const updateCountdown = useCallback((id: string, updates: Partial<Countdown>) => {
    setData((prev) => {
      const existing = prev.countdowns[id];
      if (!existing) return prev;
      const updated: Countdown = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      return {
        ...prev,
        countdowns: {
          ...prev.countdowns,
          [id]: updated
        }
      };
    });
  }, []);

  const deleteCountdown = useCallback((id: string) => {
    setData((prev) => {
      if (!prev.countdowns[id]) return prev;
      const nextCountdowns = { ...prev.countdowns };
      delete nextCountdowns[id];
      return {
        ...prev,
        countdowns: nextCountdowns
      };
    });
  }, []);

  const duplicateCountdown = useCallback(
    (id: string): Countdown | null => {
      const existing = data.countdowns[id];
      if (!existing) return null;

      const now = new Date().toISOString();
      const duplicate: Countdown = {
        ...existing,
        id: generateId(),
        title: `${existing.title} (Copy)`,
        pinned: false,
        createdAt: now,
        updatedAt: now
      };

      setData((prev) => ({
        ...prev,
        countdowns: {
          ...prev.countdowns,
          [duplicate.id]: duplicate
        }
      }));

      return duplicate;
    },
    [data.countdowns]
  );

  const togglePin = useCallback((id: string) => {
    setData((prev) => {
      const existing = prev.countdowns[id];
      if (!existing) return prev;
      return {
        ...prev,
        countdowns: {
          ...prev.countdowns,
          [id]: {
            ...existing,
            pinned: !existing.pinned,
            updatedAt: new Date().toISOString()
          }
        }
      };
    });
  }, []);

  const toggleFeatured = useCallback((id: string) => {
    setData((prev) => {
      const existing = prev.countdowns[id];
      if (!existing) return prev;
      const nextFeatured = !existing.featured;
      const nextCountdowns: Record<string, Countdown> = {};
      const now = new Date().toISOString();

      for (const [key, c] of Object.entries(prev.countdowns)) {
        if (key === id) {
          nextCountdowns[key] = {
            ...c,
            featured: nextFeatured,
            updatedAt: now
          };
        } else {
          // At most one countdown can be featured at a time
          nextCountdowns[key] =
            nextFeatured && c.featured
              ? { ...c, featured: false, updatedAt: now }
              : c;
        }
      }

      return {
        ...prev,
        countdowns: nextCountdowns
      };
    });
  }, []);

  const toggleShowOnToday = useCallback((id: string) => {
    setData((prev) => {
      const existing = prev.countdowns[id];
      if (!existing) return prev;
      return {
        ...prev,
        countdowns: {
          ...prev.countdowns,
          [id]: {
            ...existing,
            showOnToday: !existing.showOnToday,
            updatedAt: new Date().toISOString()
          }
        }
      };
    });
  }, []);

  const replaceAllCountdowns = useCallback((newData: CountdownsData) => {
    setData(newData);
  }, []);

  const value = useMemo(
    () => ({
      countdowns,
      countdownsData: data,
      activeCountdowns,
      completedCountdowns,
      featuredCountdown,
      explicitFeaturedCountdown,
      todayCountdown,
      createCountdown,
      updateCountdown,
      deleteCountdown,
      duplicateCountdown,
      togglePin,
      toggleFeatured,
      toggleShowOnToday,
      replaceAllCountdowns
    }),
    [
      countdowns,
      data,
      activeCountdowns,
      completedCountdowns,
      featuredCountdown,
      explicitFeaturedCountdown,
      todayCountdown,
      createCountdown,
      updateCountdown,
      deleteCountdown,
      duplicateCountdown,
      togglePin,
      toggleFeatured,
      toggleShowOnToday,
      replaceAllCountdowns
    ]
  );

  return <CountdownsContext.Provider value={value}>{children}</CountdownsContext.Provider>;
}

export function useCountdowns(): CountdownsContextValue {
  const ctx = useContext(CountdownsContext);
  if (!ctx) {
    throw new Error("useCountdowns must be used within a CountdownsProvider");
  }
  return ctx;
}
