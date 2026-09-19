import { useEffect, useMemo } from "react";
import type { ThemePreference } from "../types";

export function useTheme(theme: ThemePreference, setTheme: (t: ThemePreference) => void) {
  const isDark = useMemo(() => {
    if (theme === "dark") return true;
    if (theme === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") root.setAttribute("data-theme", "light");
    else if (theme === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
  }, [theme]);

  // Keep re-rendering in sync if the OS theme changes while on "system".
  useEffect(() => {
    if (theme !== "auto" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setTheme("auto");
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [theme, setTheme]);

  function toggle() {
    setTheme(isDark ? "light" : "dark");
  }

  return { isDark, toggle };
}
