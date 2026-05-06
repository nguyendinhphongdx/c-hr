"use client";

import { Loader2 } from "lucide-react";

import { AgendaEmptyState } from "../components/AgendaEmptyState";
import { RbcCalendar } from "../components/RbcCalendar";

import type { CommonViewProps } from "./types";

/**
 * Agenda / "Danh sách" view — vertical chronological list, ~30 days
 * forward by default. Replaces RBC's plain "no events" span with a
 * styled empty card when the range is empty.
 */
export function CalendarViewRange(props: CommonViewProps) {
  const empty = !props.isLoading && props.events.length === 0;

  return (
    <div className="relative min-h-0 flex-1">
      {props.isLoading && (
        <div className="pointer-events-none absolute right-4 top-3 z-20 inline-flex items-center gap-1.5 rounded-md bg-background/80 px-2.5 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
          <Loader2 className="h-3 w-3 animate-spin" />
          Đang tải…
        </div>
      )}

      <RbcCalendar
        view="agenda"
        date={props.date}
        events={props.events}
        scrollToTime={props.scrollToTime}
        onView={props.onView}
        onNavigate={props.onNavigate}
        onSelectSlot={props.onSelectSlot}
        onSelectEvent={props.onSelectEvent}
        renderToolbar={props.renderToolbar}
      />

      {empty && <AgendaEmptyState onCreate={props.onCreate} />}
    </div>
  );
}
