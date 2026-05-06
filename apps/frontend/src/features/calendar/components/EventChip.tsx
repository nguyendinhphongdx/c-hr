"use client";

import { format } from "date-fns";
import type { EventProps } from "react-big-calendar";

import type { CalEvent } from "../types";

/**
 * Event chip rendered inside RBC time-grid cells. Compact layout: time
 * prefix (HH:mm) then title — matches the screenshot reference.
 */
export function EventChip({ event }: EventProps<CalEvent>) {
  const cancelled = event.resource.status === "CANCELLED";
  const tentative = event.resource.status === "TENTATIVE";
  return (
    <div
      className="flex items-center gap-1 truncate px-1.5 py-0.5 text-xs leading-tight"
      title={event.title}
      data-status={event.resource.status}
    >
      <span className="font-medium">
        {format(event.start, "HH:mm")}
      </span>
      <span
        className={
          cancelled
            ? "truncate line-through opacity-60"
            : tentative
              ? "truncate italic"
              : "truncate"
        }
      >
        {event.title}
      </span>
    </div>
  );
}
