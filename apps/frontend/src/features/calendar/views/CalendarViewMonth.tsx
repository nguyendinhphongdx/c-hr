"use client";

import { Loader2 } from "lucide-react";

import { RbcCalendar } from "../components/shell/RbcCalendar";

import type { CommonViewProps } from "./types";

/**
 * Month grid (7×6). No time-grid → no NowLine; the "today" cell is
 * styled via `.rbc-now` in calendar.css.
 */
export function CalendarViewMonth(props: CommonViewProps) {
  return (
    <div className="relative min-h-0 flex-1">
      {props.isLoading && (
        <div className="pointer-events-none absolute right-4 top-3 z-20 inline-flex items-center gap-1.5 rounded-md bg-background/80 px-2.5 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
          <Loader2 className="h-3 w-3 animate-spin" />
          Đang tải…
        </div>
      )}

      <RbcCalendar
        view="month"
        date={props.date}
        events={props.events}
        scrollToTime={props.scrollToTime}
        onView={props.onView}
        onNavigate={props.onNavigate}
        onSelectSlot={props.onSelectSlot}
        onSelectEvent={props.onSelectEvent}
        renderToolbar={props.renderToolbar}
      />
    </div>
  );
}
