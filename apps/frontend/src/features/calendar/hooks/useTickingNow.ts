"use client";

import { useEffect, useState } from "react";

/**
 * Subscribe to a "current time" Date that ticks every minute, aligned to
 * the wall-clock minute boundary. Also refreshes on tab focus and
 * `visibilitychange` because browsers throttle setInterval in inactive
 * tabs (≥1min, often longer when laptop sleeps) — without those listeners
 * the value can drift hours after a long idle.
 *
 * Returned Date reference changes on each tick so consumers can use it
 * as a reactive dep (positioning a current-time indicator, etc.).
 */
export function useTickingNow(): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const initialDelay = 60_000 - (Date.now() % 60_000) + 100;
    const timeoutId = setTimeout(() => {
      tick();
      intervalId = setInterval(tick, 60_000);
    }, initialDelay);

    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", tick);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", tick);
    };
  }, []);

  return now;
}
