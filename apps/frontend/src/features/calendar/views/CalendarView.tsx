"use client";

import { useCallback, useMemo, useState } from "react";
import type { ToolbarProps, View } from "react-big-calendar";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { useAuth } from "@/features/auth";

import { CalendarSidebar } from "../components/CalendarSidebar";
import { CalendarToolbar } from "../components/CalendarToolbar";
import { EventCreateDialog } from "../components/EventCreateDialog";
import { EventDetailPanel } from "../components/EventDetailPanel";
import { useCalendarUrlState } from "../hooks/useCalendarUrlState";
import { useTickingNow } from "../hooks/useTickingNow";
import {
  useDeleteEvent,
  useEvent,
  useEvents,
} from "../hooks/useEvents";
import { expandRangeForView } from "../lib/range";
import type { CalEvent } from "../types";

import { CalendarViewDay } from "./CalendarViewDay";
import { CalendarViewMonth } from "./CalendarViewMonth";
import { CalendarViewRange } from "./CalendarViewRange";
import { CalendarViewWeek } from "./CalendarViewWeek";
import type { CommonViewProps } from "./types";

/**
 * Top-level calendar page orchestrator. Owns shared state + data
 * (view, date, events, now-tick) and dispatches to per-view components
 * (Day / Week / Month / Range) which render their own surface.
 */
export function CalendarView() {
  const { user } = useAuth();

  // ── State ────────────────────────────────────────────────────────
  const { view, setView, date, setDate } = useCalendarUrlState();
  const now = useTickingNow();

  const [feedTab, setFeedTab] = useState<"events" | "tasks">("events");
  const [createOpen, setCreateOpen] = useState(false);
  const [createSlot, setCreateSlot] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleUserIds, setVisibleUserIds] = useState<string[]>(
    user ? [user.id] : [],
  );

  // Bumped to force RBC's `scrollToTime` prop reference change. Recomputes
  // on view switch (auto via [view] dep) + on "Hôm nay" — other nav
  // (prev/next, mini-cal click) preserves the user's manual scroll.
  const [scrollNonce, setScrollNonce] = useState(0);
  const scrollToTime = useMemo(() => {
    const t = new Date();
    t.setHours(Math.max(0, t.getHours() - 1), 0, 0, 0);
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, scrollNonce]);

  // ── Data ─────────────────────────────────────────────────────────
  const { from, to } = useMemo(
    () => expandRangeForView(view, date),
    [view, date],
  );

  const { data: rows, isLoading, isFetching } = useEvents({
    from: from.toISOString(),
    to: to.toISOString(),
    userIds: visibleUserIds.length > 0 ? visibleUserIds : undefined,
  });

  const detail = useEvent(selectedId);
  const deleteEvent = useDeleteEvent();

  const events: CalEvent[] = useMemo(
    () =>
      (rows ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        start: new Date(r.startAt),
        end: new Date(r.endAt),
        resource: r,
        allDay: r.isAllDay,
      })),
    [rows],
  );

  // ── Handlers ─────────────────────────────────────────────────────
  const onSelectSlot = useCallback((slot: { start: Date; end: Date }) => {
    setCreateSlot({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
    });
    setSelectedId(null);
    setCreateOpen(true);
  }, []);

  const onSelectEvent = useCallback((ev: CalEvent) => {
    setSelectedId(ev.id);
    setCreateSlot(null);
  }, []);

  const onCreateClick = useCallback(() => {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    setCreateSlot({ start: start.toISOString(), end: end.toISOString() });
    setSelectedId(null);
    setCreateOpen(true);
  }, []);

  const onDelete = useCallback(
    async (id: string) => {
      if (!confirm("Xoá sự kiện này?")) return;
      try {
        await deleteEvent.mutateAsync(id);
        toast.success("Đã xoá");
        setSelectedId(null);
      } catch (err) {
        toast.error("Không xoá được", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [deleteEvent],
  );

  const handleNavigate = useCallback(
    (next: Date, _v?: View, action?: string) => {
      if (action === "TODAY") {
        // RBC's `next` comes from getNow() — could be stale after long
        // tab idle. Use a fresh Date and bump scrollNonce to also re-
        // scroll to the current hour.
        setDate(new Date());
        setScrollNonce((n) => n + 1);
        return;
      }
      setDate(next);
    },
    [setDate],
  );

  const toggleUser = useCallback((userId: string, on: boolean) => {
    setVisibleUserIds((prev) =>
      on
        ? Array.from(new Set([...prev, userId]))
        : prev.filter((u) => u !== userId),
    );
  }, []);

  const renderToolbar = useCallback(
    (props: ToolbarProps<CalEvent, object>) => (
      <CalendarToolbar
        {...props}
        onCreate={onCreateClick}
        feedTab={feedTab}
        onFeedTabChange={setFeedTab}
      />
    ),
    [feedTab, onCreateClick],
  );

  // ── View dispatch ────────────────────────────────────────────────
  const commonViewProps: CommonViewProps = {
    date,
    events,
    now,
    scrollToTime,
    isLoading: isLoading || isFetching,
    onView: setView,
    onNavigate: handleNavigate,
    onSelectSlot,
    onSelectEvent,
    renderToolbar,
    onCreate: onCreateClick,
  };

  return (
    <PageContainer variant="bleed" className="h-full p-3!">
      <div className="flex h-full w-full overflow-hidden rounded-lg border bg-background shadow-sm">
        <CalendarSidebar
          selectedDate={date}
          onSelectDate={setDate}
          mainView={view}
          visibleUserIds={visibleUserIds}
          onToggleUser={toggleUser}
        />

        <div className="flex min-w-0 flex-1 flex-col bg-background">
          {view === "day" && <CalendarViewDay {...commonViewProps} />}
          {(view === "week" || view === "work_week") && (
            <CalendarViewWeek {...commonViewProps} />
          )}
          {view === "month" && <CalendarViewMonth {...commonViewProps} />}
          {view === "agenda" && <CalendarViewRange {...commonViewProps} />}

          {selectedId && detail.data && (
            <EventDetailPanel
              event={detail.data}
              onEdit={() => setCreateOpen(true)}
              onDelete={() => onDelete(detail.data!.id)}
              onClose={() => setSelectedId(null)}
            />
          )}
        </div>

        <EventCreateDialog
          open={createOpen}
          onClose={() => {
            setCreateOpen(false);
            setCreateSlot(null);
          }}
          initialStart={createSlot?.start}
          initialEnd={createSlot?.end}
          editing={selectedId ? (detail.data ?? null) : null}
        />
      </div>
    </PageContainer>
  );
}
