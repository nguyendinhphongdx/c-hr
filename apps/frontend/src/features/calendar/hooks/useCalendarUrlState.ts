"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Views, type View } from "react-big-calendar";

import { formatDateParam, parseDateParam } from "../lib/format";

const VALID_VIEWS: View[] = ["day", "week", "month", "agenda"];

/**
 * Two-way sync of `view` + `date` calendar state with the URL
 * (`?view=week&date=2026-05-07`). Initial state seeded from the URL so
 * refresh / shared link reopens the same range; subsequent local changes
 * `router.replace` the URL without scroll-jump or history clutter.
 */
export function useCalendarUrlState(): {
  view: View;
  setView: React.Dispatch<React.SetStateAction<View>>;
  date: Date;
  setDate: React.Dispatch<React.SetStateAction<Date>>;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [view, setView] = useState<View>(() => {
    const v = searchParams.get("view") as View | null;
    return v && VALID_VIEWS.includes(v) ? v : Views.WEEK;
  });
  const [date, setDate] = useState<Date>(
    () => parseDateParam(searchParams.get("date")) ?? new Date(),
  );

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    params.set("date", formatDateParam(date));
    const next = `${pathname}?${params.toString()}`;
    const current = `${pathname}?${searchParams.toString()}`;
    if (next !== current) {
      router.replace(next, { scroll: false });
    }
  }, [view, date, pathname, router, searchParams]);

  return { view, setView, date, setDate };
}
