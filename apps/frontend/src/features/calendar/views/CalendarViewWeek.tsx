"use client";

import { Loader2 } from "lucide-react";
import { useRef } from "react";

import { NowLine } from "../components/shell/NowLine";
import { RbcCalendar } from "../components/shell/RbcCalendar";

import type { CommonViewProps } from "./types";

/**
 * 7-day week view. Same time-grid as Day, NowLine sits on today's column.
 */
export function CalendarViewWeek(props: CommonViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative min-h-0 flex-1">
      {props.isLoading && (
        <div className="pointer-events-none absolute right-4 top-3 z-20 inline-flex items-center gap-1.5 rounded-md bg-background/80 px-2.5 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
          <Loader2 className="h-3 w-3 animate-spin" />
          Đang tải…
        </div>
      )}

      <RbcCalendar
        view="week"
        date={props.date}
        events={props.events}
        scrollToTime={props.scrollToTime}
        onView={props.onView}
        onNavigate={props.onNavigate}
        onSelectSlot={props.onSelectSlot}
        onSelectEvent={props.onSelectEvent}
        renderToolbar={props.renderToolbar}
      />

      <NowLine
        now={props.now}
        containerRef={containerRef}
        enabled
        layoutKey="week"
      />
    </div>
  );
}
