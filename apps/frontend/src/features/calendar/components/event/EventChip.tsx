"use client";

import { format } from "date-fns";
import { MapPin } from "lucide-react";
import type { EventProps } from "react-big-calendar";

import { cn } from "@/lib/utils";

import { userColorFromId } from "../../lib/user-color";
import type { CalEvent } from "../../types";

/**
 * Event chip — the only visible card per event. RBC's `.rbc-event`
 * wrapper is stripped to transparent (see styles/calendar.css), so this
 * component owns the border + bg + accent + typography.
 *
 * Responsive: lines beyond the title hide when the slot is too short
 * for them (CSS-only via `@container`-style line-clamp + `last:hidden`
 * tricks would be heavier; we use `min-h` queries on the wrapper class
 * and let CSS handle truncation). The chip auto-shrinks to fit.
 */
export function EventChip({ event }: EventProps<CalEvent>) {
  const status = event.resource.status;
  const cancelled = status === "CANCELLED";
  const tentative = status === "TENTATIVE";
  // Color priority:
  // 1. paletteColor — precomputed at the data-transform stage from
  //    follow.color (stored on BE) + SELF_COLOR for self lane. Stable,
  //    distinct, no hash collisions on adjacent userIds.
  // 2. explicit per-event color
  // 3. first resource color
  // 4. fallback hash from ownerId (incidental attendees not in your
  //    follow list, etc.).
  const palette =
    event.paletteColor ||
    event.resource.color ||
    event.resource.resources?.[0]?.resource.color ||
    userColorFromId(event.resource.ownerId);
  const location = event.resource.location;
  const startStr = format(event.start, "HH:mm");
  const endStr = event.end ? format(event.end, "HH:mm") : null;

  return (
    <div
      className={cn(
        "group relative flex h-full w-full flex-col overflow-hidden rounded-md border border-l-4 text-left text-[11px] leading-tight transition-shadow hover:shadow-md",
        cancelled && "opacity-60",
      )}
      style={{
        // Opaque pastel: blend palette with theme bg so events fully
        // hide grid + NowLine, while staying readable. Left accent
        // stripe is the chip's own thicker left border — it follows the
        // rounded corners naturally instead of an inner pseudo-element
        // that fights the parent's border-radius.
        backgroundColor: `color-mix(in oklab, ${palette} 22%, var(--background))`,
        borderColor: palette,
      }}
      title={`${event.title}${location ? ` · ${location}` : ""}`}
      data-status={status}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-px overflow-hidden px-2 py-1">
        <span
          className={cn(
            "truncate font-semibold text-foreground",
            cancelled && "line-through",
            tentative && "italic",
          )}
        >
          {event.title}
        </span>
        <span className="hide-when-cramped truncate text-[10px] tabular-nums text-muted-foreground">
          {startStr}
          {endStr ? ` – ${endStr}` : ""}
        </span>
        {location && (
          <span className="hide-when-cramped flex items-center gap-1 truncate text-[10px] text-muted-foreground">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{location}</span>
          </span>
        )}
      </div>
    </div>
  );
}
