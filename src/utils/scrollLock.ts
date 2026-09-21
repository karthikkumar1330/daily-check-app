import { useEffect, useRef } from "react";

/**
 * Centralized, Reference-Counted Scroll Lock Manager.
 *
 * Prevents multiple modals/drawers/overlays from independently clobbering
 * body overflow, and guarantees body scroll restoration when all overlays close.
 */
class ScrollLockManager {
  private lockCount = 0;
  private originalOverflow = "";
  private originalPaddingRight = "";

  public acquire(): void {
    if (typeof document === "undefined") return;

    if (this.lockCount === 0) {
      this.originalOverflow = document.body.style.overflow || "";
      this.originalPaddingRight = document.body.style.paddingRight || "";

      // Check if scrollbar takes space to prevent layout jump
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }

      document.body.style.overflow = "hidden";
    }
    this.lockCount += 1;
  }

  public release(): void {
    if (typeof document === "undefined") return;

    if (this.lockCount > 0) {
      this.lockCount -= 1;
      if (this.lockCount === 0) {
        document.body.style.overflow = this.originalOverflow;
        document.body.style.paddingRight = this.originalPaddingRight;
      }
    }
  }

  public reset(): void {
    if (typeof document === "undefined") return;
    this.lockCount = 0;
    document.body.style.overflow = this.originalOverflow;
    document.body.style.paddingRight = this.originalPaddingRight;
  }

  public getCount(): number {
    return this.lockCount;
  }
}

export const scrollLockManager = new ScrollLockManager();

/**
 * React hook that acquires a reference-counted scroll lock when `active` is true.
 * Automatically releases the lock on close or component unmount.
 * Safe against React StrictMode and multiple simultaneous modals.
 */
export function useScrollLock(active: boolean): void {
  const isLockedRef = useRef(false);

  useEffect(() => {
    if (active && !isLockedRef.current) {
      scrollLockManager.acquire();
      isLockedRef.current = true;
    } else if (!active && isLockedRef.current) {
      scrollLockManager.release();
      isLockedRef.current = false;
    }

    return () => {
      if (isLockedRef.current) {
        scrollLockManager.release();
        isLockedRef.current = false;
      }
    };
  }, [active]);
}
