import type { ReactElement } from "react";
import type { ToolbarProps, View } from "react-big-calendar";

import type { CalEvent } from "../types";

/** Props every per-view component (Day/Week/Month/Range) consumes. */
export interface CommonViewProps {
  date: Date;
  events: CalEvent[];
  /** Ticks every minute — drives NowLine + ephemeral indicators. */
  now: Date;
  /** Scroll target on mount / view switch — caller controls reference identity. */
  scrollToTime: Date;
  isLoading: boolean;

  onView: (v: View) => void;
  onNavigate: (next: Date, view?: View, action?: string) => void;
  onSelectSlot: (slot: { start: Date; end: Date }) => void;
  onSelectEvent: (event: CalEvent) => void;

  /** Top toolbar (Hôm nay / prev/next / range / view picker / +Tạo) —
   *  shared across all views, passed through RBC's `components.toolbar`. */
  renderToolbar: (props: ToolbarProps<CalEvent, object>) => ReactElement;

  /** "+Tạo" handler used by view-specific overlays (e.g. agenda empty card). */
  onCreate: () => void;
}
