import { useScrollLock } from "../utils/scrollLock";

/**
 * Locks page scroll behind a modal/drawer using the centralized, reference-counted manager.
 * Multiple simultaneous locks are safe; locks decrement cleanly on unmount or close.
 */
export function useBodyScrollLock(active: boolean): void {
  useScrollLock(active);
}

export { useScrollLock };

