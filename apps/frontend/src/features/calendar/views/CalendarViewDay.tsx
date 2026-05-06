"use client";

import { Loader2 } from "lucide-react";
import { useRef } from "react";

import { NowLine } from "../components/NowLine";
import { RbcCalendar } from "../components/RbcCalendar";

import type { CommonViewProps } from "./types";

/**
 * Single-day view. 24h time grid + NowLine overlay on today's column.
 * UI surface owned by this component — future enhancements (e.g. focus
 * blocks, working hours dim) plug in here without touching siblings.
 */
export function CalendarViewDay(props: CommonViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative min-h-0 flex-1">
      {props.isLoading && <LoadingBadge />}

      <RbcCalendar
        view="day"
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
        layoutKey="day"
      />
    </div>
  );
}

function LoadingBadge() {
  return (
    <div className="pointer-events-none absolute right-4 top-3 z-20 inline-flex items-center gap-1.5 rounded-md bg-background/80 px-2.5 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
      <Loader2 className="h-3 w-3 animate-spin" />
      Đang tải…
    </div>
  );
}
