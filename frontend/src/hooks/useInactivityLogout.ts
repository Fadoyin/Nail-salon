"use client";

import { useEffect, useCallback } from "react";

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes

export function useInactivityLogout(onLogout: () => void, enabled = true) {
  const resetTimer = useCallback(() => {
    if (!enabled) return;
    const existing = (window as unknown as { __adminTimer?: ReturnType<typeof setTimeout> }).__adminTimer;
    if (existing) clearTimeout(existing);
    (window as unknown as { __adminTimer?: ReturnType<typeof setTimeout> }).__adminTimer = setTimeout(onLogout, INACTIVITY_MS);
  }, [onLogout, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      const existing = (window as unknown as { __adminTimer?: ReturnType<typeof setTimeout> }).__adminTimer;
      if (existing) clearTimeout(existing);
    };
  }, [resetTimer, enabled]);
}
