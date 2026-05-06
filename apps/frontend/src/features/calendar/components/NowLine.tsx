"use client";

import { format } from "date-fns";
import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

interface NowLineProps {
  now: Date;
  /** Wrapper containing the BigCalendar — we query `.rbc-time-content`,
   *  `.rbc-time-gutter`, and the per-day `.rbc-day-slot` cells inside. */
  containerRef: RefObject<HTMLDivElement | null>;
  /** Hidden when calendar is not in a time-grid view (month/agenda). */
  enabled: boolean;
  /** Forces a re-measure when RBC swaps DOM (e.g. day↔week). */
  layoutKey: string | number;
}

interface Layout {
  /** Portal target — `.rbc-time-content` is the scrollable inner; children
   *  rendered here scroll with the grid (NOT sticky). */
  target: HTMLElement;
  /** Total scrollable height of the time-grid (24h tall). */
  contentHeight: number;
  /** Width of the gutter (left labels area). */
  gutterWidth: number;
  /** Today's column rect relative to .rbc-time-content's inner origin.
   *  Null when today isn't in the visible date range. */
  today: { left: number; width: number } | null;
}

const NOW_COLOR = "oklch(0.65 0.22 22)";

export function NowLine({ now, containerRef, enabled, layoutKey }: NowLineProps) {
  const [layout, setLayout] = useState<Layout | null>(null);

  // Measure DOM bounds. Re-runs on view switch (`layoutKey`) and on
  // container resize. NOT keyed on `now` — DOM doesn't move every
  // minute, only the line's `top` does (re-rendered via JSX below).
  useEffect(() => {
    if (!enabled || !containerRef.current) {
      setLayout(null);
      return;
    }
    const root = containerRef.current;

    const measure = () => {
      const content = root.querySelector(".rbc-time-content") as HTMLElement | null;
      if (!content) {
        setLayout(null);
        return;
      }
      const gutter = content.querySelector(".rbc-time-gutter") as HTMLElement | null;
      const todayCol = content.querySelector(
        ".rbc-day-slot.rbc-today",
      ) as HTMLElement | null;

      const contentRect = content.getBoundingClientRect();
      const gutterWidth = gutter ? gutter.getBoundingClientRect().width : 0;

      let today: Layout["today"] = null;
      if (todayCol) {
        const r = todayCol.getBoundingClientRect();
        today = {
          left: r.left - contentRect.left,
          width: r.width,
        };
      }

      setLayout({
        target: content,
        contentHeight: content.scrollHeight,
        gutterWidth,
        today,
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    // Run once more next paint — RBC may not have laid out yet on
    // layoutKey change.
    const raf = requestAnimationFrame(measure);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [enabled, containerRef, layoutKey]);

  if (!layout) return null;

  const minutes = now.getHours() * 60 + now.getMinutes();
  const fraction = Math.max(0, Math.min(1, minutes / 1440));
  const top = fraction * layout.contentHeight;

  // Past columns occupy [gutter, today.left). Future columns from today's
  // right edge are intentionally left bare (xspace / Outlook convention).
  const hasPast = layout.today !== null && layout.today.left > layout.gutterWidth;

  return createPortal(
    <>
      {/* Time-of-day badge — fits inside the gutter, right-aligned so it
       *  butts up against the gutter/grid border without overlapping the
       *  today-column dot that sits just past the border. */}
      <div
        className="pointer-events-none absolute z-20 select-none rounded-md px-1 font-semibold text-white tabular-nums"
        style={{
          top: `${top - 8}px`,
          right: `calc(100% - ${layout.gutterWidth - 2}px)`,
          backgroundColor: NOW_COLOR,
          fontSize: "10px",
          lineHeight: "16px",
          height: "16px",
        }}
      >
        {format(now, "HH:mm")}
      </div>

      {/* Past-day segment — dashed line from gutter's right edge to today. */}
      {hasPast && layout.today && (
        <div
          className="pointer-events-none absolute z-10"
          style={{
            top: `${top - 1}px`,
            left: `${layout.gutterWidth}px`,
            width: `${layout.today.left - layout.gutterWidth}px`,
            height: 0,
            borderTopStyle: "dashed",
            borderTopWidth: "2px",
            borderTopColor: NOW_COLOR,
          }}
        />
      )}

      {/* Today — solid line + leading dot. */}
      {layout.today && (
        <>
          <div
            className="pointer-events-none absolute z-20 rounded-full"
            style={{
              top: `${top - 4}px`,
              left: `${layout.today.left}px`,
              width: "8px",
              height: "8px",
              backgroundColor: NOW_COLOR,
              boxShadow: `0 0 0 2px color-mix(in srgb, ${NOW_COLOR} 30%, transparent)`,
            }}
          />
          <div
            className="pointer-events-none absolute z-10"
            style={{
              top: `${top}px`,
              left: `${layout.today.left}px`,
              width: `${layout.today.width}px`,
              height: "2px",
              backgroundColor: NOW_COLOR,
            }}
          />
        </>
      )}
      {/* Future days intentionally render no line. */}
    </>,
    layout.target,
  );
}
