"use client";

import { useCallback } from "react";
import {
  Calendar as BigCalendar,
  type ToolbarProps,
  type View,
} from "react-big-calendar";

import { rbcFormats, rbcLocalizer, rbcMessages } from "../../lib/rbc-config";
import type { CalEvent } from "../../types";

import { EventChip } from "../event/EventChip";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "../../styles/calendar.css";

interface RbcCalendarProps {
  view: View;
  date: Date;
  events: CalEvent[];
  scrollToTime: Date;

  onView: (v: View) => void;
  onNavigate: (next: Date, view?: View, action?: string) => void;
  onSelectSlot: (slot: { start: Date; end: Date }) => void;
  onSelectEvent: (event: CalEvent) => void;

  renderToolbar: (props: ToolbarProps<CalEvent, object>) => React.ReactElement;
}

/**
 * Thin wrapper around `react-big-calendar` that bakes in the project's
 * vi-VN localizer, custom toolbar/event chip, and shared formats.
 *
 * Per-view components (`CalendarViewDay/Week/Month/Range`) render this
 * with their `view` fixed and add their own overlays around it.
 */
export function RbcCalendar({
  view,
  date,
  events,
  scrollToTime,
  onView,
  onNavigate,
  onSelectSlot,
  onSelectEvent,
  renderToolbar,
}: RbcCalendarProps) {
  const getNow = useCallback(() => new Date(), []);

  return (
    <BigCalendar
      localizer={rbcLocalizer}
      culture="vi"
      messages={rbcMessages}
      formats={rbcFormats}
      events={events}
      views={["month", "week", "day", "agenda"]}
      view={view}
      onView={onView}
      date={date}
      onNavigate={onNavigate}
      selectable
      popup
      step={30}
      timeslots={2}
      getNow={getNow}
      scrollToTime={scrollToTime}
      onSelectSlot={onSelectSlot}
      onSelectEvent={onSelectEvent}
      startAccessor="start"
      endAccessor="end"
      components={{
        toolbar: renderToolbar,
        event: EventChip,
      }}
      eventPropGetter={(ev) =>
        ({ "data-status": (ev as CalEvent).resource.status }) as Record<
          string,
          string
        >
      }
      style={{ height: "100%" }}
    />
  );
}
