import { format } from "date-fns";
import { vi } from "date-fns/locale";
import type { View } from "react-big-calendar";

/** Vietnamese display label for the date range a given view shows. */
export function formatHeaderRange(view: View, date: Date): string {
  if (view === "month") {
    return format(date, "'Tháng' M, yyyy", { locale: vi });
  }
  if (view === "day") {
    return format(date, "EEEE, dd 'Tháng' M, yyyy", { locale: vi });
  }
  if (view === "agenda") {
    const end = new Date(date);
    end.setDate(end.getDate() + 30);
    return `${format(date, "d 'Tháng' M", { locale: vi })} - ${format(end, "d 'Tháng' M, yyyy", { locale: vi })}`;
  }
  // week — Mon..Sun
  const start = new Date(date);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - (day - 1));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} - ${end.getDate()} Tháng ${start.getMonth() + 1}, ${start.getFullYear()}`;
  }
  return `${start.getDate()} ${format(start, "MMM", { locale: vi })} - ${end.getDate()} ${format(end, "MMM yyyy", { locale: vi })}`;
}

/** Parse `?date=YYYY-MM-DD` URL param to a local-midnight Date, or null. */
export function parseDateParam(s: string | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Format a Date as `YYYY-MM-DD` in local time (matches `parseDateParam`). */
export function formatDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
