"use client";

import { startOfWeek } from "date-fns";
import { useMemo } from "react";
import type { Matcher } from "react-day-picker";
import type { View } from "react-big-calendar";

/**
 * When the main calendar is in `week` view, returns a date-range matcher
 * covering the active week (Mon–Sun). Used by the mini-cal in sidebar +
 * the toolbar's date-picker popover to highlight "currently visible
 * week" without duplicating the same useMemo logic.
 */
export function useActiveWeekRange(view: View, date: Date): Matcher | undefined {
  return useMemo(() => {
    if (view !== "week" && view !== "work_week") return undefined;
    const from = startOfWeek(date, { weekStartsOn: 1 });
    const to = new Date(from);
    to.setDate(from.getDate() + 6);
    return { from, to };
  }, [view, date]);
}
