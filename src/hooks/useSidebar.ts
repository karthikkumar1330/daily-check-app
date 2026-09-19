import { useCallback, useEffect, useState } from "react";
import { useBodyScrollLock } from "./useBodyScrollLock";

export function useSidebar() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  // Escape closes the drawer (desktop keyboard use).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Lock body scroll while the drawer is open on mobile.
  useBodyScrollLock(open);

  return { open, setOpen, close, toggle };
}
