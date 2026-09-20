import { useEffect, useState } from "react";
import { todayStr } from "../utils/dateUtils";

/**
 * Returns today's date (YYYY-MM-DD) and keeps it correct without polling:
 *  - recalculated once on mount
 *  - recalculated when the tab/app regains visibility (covers device sleep,
 *    backgrounding, and reopening an installed PWA)
 *  - a single `setTimeout` fires once at the next local midnight to catch a
 *    date rollover in an app left open in the foreground; it then
 *    reschedules itself for the following midnight. This is not a ticking
 *    timer — at most one timer fires per calendar day.
 */
export function useTodayDate(): string {
  const [today, setToday] = useState(todayStr());

  useEffect(() => {
    function recalc() {
      setToday((prev) => {
        const next = todayStr();
        return next === prev ? prev : next;
      });
    }

    function onVisible() {
      if (document.visibilityState === "visible") recalc();
    }
    document.addEventListener("visibilitychange", onVisible);

    let timeoutId: number | undefined;
    function scheduleMidnightCheck() {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
      const ms = nextMidnight.getTime() - now.getTime();
      timeoutId = window.setTimeout(() => {
        recalc();
        scheduleMidnightCheck();
      }, ms);
    }
    scheduleMidnightCheck();

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  return today;
}
