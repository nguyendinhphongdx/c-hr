"use client";

import { addMonths, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface MonthRangePickerProps {
  /** YYYY-MM-DD */
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function setMonth(anchor: Date): { from: string; to: string } {
  const start = startOfMonth(anchor);
  const end = endOfMonth(anchor);
  return { from: toYmd(start), to: toYmd(end) };
}

/**
 * v1 month-only navigator. Phase 7 may add a "Khoảng" mode for custom
 * date ranges; for now HR's natural rhythm is "tháng này / tháng trước"
 * so prev/next buttons + Hôm nay are enough.
 */
export function MonthRangePicker({ from, onChange }: MonthRangePickerProps) {
  const anchor = new Date(`${from}T00:00:00`);
  const label = format(anchor, "'Tháng' M, yyyy", { locale: vi });

  const goPrev = () => onChange(setMonth(subMonths(anchor, 1)));
  const goNext = () => onChange(setMonth(addMonths(anchor, 1)));
  const goToday = () => onChange(setMonth(new Date()));

  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="outline" size="sm" onClick={goToday}>
        Tháng này
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={goPrev}
        aria-label="Tháng trước"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={goNext}
        aria-label="Tháng sau"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <span className="ml-1 text-sm font-medium capitalize">{label}</span>
    </div>
  );
}
