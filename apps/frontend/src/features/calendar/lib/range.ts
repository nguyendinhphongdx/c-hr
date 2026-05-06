import { startOfDay, startOfWeek } from "date-fns";
import type { View } from "react-big-calendar";

/**
 * Compute the [from, to) ISO date range to query when rendering a given
 * RBC view anchored on `anchor`. Mirrors what RBC paints on screen so
 * the BE response covers exactly what's visible.
 *
 * - day:    [start, +1d)
 * - week:   [Mon, +7d)
 * - agenda: [start, +30d)
 * - month:  surrounding-week-padded grid (≈ 6 rows × 7 cols)
 */
export function expandRangeForView(
  view: View,
  anchor: Date,
): { from: Date; to: Date } {
  const d = startOfDay(anchor);

  if (view === "day") {
    const end = new Date(d);
    end.setDate(end.getDate() + 1);
    return { from: d, to: end };
  }

  if (view === "week" || view === "work_week") {
    const start = startOfWeek(d, { weekStartsOn: 1 });
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { from: start, to: end };
  }

  if (view === "agenda") {
    const end = new Date(d);
    end.setDate(end.getDate() + 30);
    return { from: d, to: end };
  }

  // month — pad to the surrounding weeks.
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
  const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const from = startOfWeek(monthStart, { weekStartsOn: 1 });
  const to = new Date(startOfWeek(monthEnd, { weekStartsOn: 1 }));
  to.setDate(to.getDate() + 7);
  return { from, to };
}
