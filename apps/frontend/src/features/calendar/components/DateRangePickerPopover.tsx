"use client";

import { vi } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { View } from "react-big-calendar";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useActiveWeekRange } from "../hooks/useActiveWeekRange";
import { formatHeaderRange } from "../lib/format";

interface DateRangePickerPopoverProps {
  view: View;
  date: Date;
  onSelect: (next: Date) => void;
}

/**
 * Toolbar trigger that shows the current range label and opens a
 * day-picker popover. When the main view is "week", the popover paints
 * the entire active week so users see what range they're viewing while
 * picking a new anchor day.
 */
export function DateRangePickerPopover({
  view,
  date,
  onSelect,
}: DateRangePickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const weekRange = useActiveWeekRange(view, date);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <span>{formatHeaderRange(view, date)}</span>
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-68 p-2">
        <Calendar
          mode="single"
          locale={vi}
          showOutsideDays
          weekStartsOn={1}
          selected={date}
          onSelect={(d) => {
            if (!d) return;
            onSelect(d);
            setOpen(false);
          }}
          className="w-full p-0"
          modifiers={weekRange ? { activeWeek: weekRange } : undefined}
          modifiersClassNames={{ activeWeek: "rdp-active-week" }}
        />
      </PopoverContent>
    </Popover>
  );
}
