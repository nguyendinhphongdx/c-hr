"use client";

import { useCallback, useMemo, useState } from "react";
import type { ToolbarProps, View } from "react-big-calendar";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { useAuth } from "@/features/auth";

import { EventCreateDialog } from "../components/event/EventCreateDialog";
import { EventDetailDialog } from "../components/event/EventDetailDialog";
import { CalendarSidebar } from "../components/shell/CalendarSidebar";
import { CalendarToolbar } from "../components/shell/CalendarToolbar";
import { useCalendarFollows } from "../hooks/useCalendarFollows";
import { useCalendarUrlState } from "../hooks/useCalendarUrlState";
import { useTickingNow } from "../hooks/useTickingNow";
import {
  useDeleteEvent,
  useEvent,
  useEvents,
} from "../hooks/useEvents";
import { expandRangeForView } from "../lib/range";
import { SELF_COLOR } from "../lib/user-color";
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

  // Visibility is *derived* from `follows`: anyone you follow is visible
  // by default, plus self. F5 → re-fetch follows → same derived set, no
  // localStorage needed. `hiddenUserIds` is a session-only "untick" layer
  // for temporarily hiding without unfollowing — resets on reload.
  const followsQuery = useCalendarFollows();
  const followedUserIds = useMemo(
    () =>
      (followsQuery.data ?? [])
        .map((f) => f.followed?.user?.id)
        .filter((u): u is string => !!u),
    [followsQuery.data],
  );
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>([]);
  const visibleUserIds = useMemo(() => {
    if (!user) return [];
    const all = [user.id, ...followedUserIds];
    const hidden = new Set(hiddenUserIds);
    return all.filter((u) => !hidden.has(u));
  }, [user, followedUserIds, hiddenUserIds]);

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

  // userId → color, sourced from BE-stored follow.color (stable, distinct
  // per follow). Self gets a fixed brand color outside the follow palette.
  const colorByUserId = useMemo(() => {
    const map = new Map<string, string>();
    if (user) map.set(user.id, SELF_COLOR);
    for (const f of followsQuery.data ?? []) {
      const uid = f.followed?.user?.id;
      if (uid) map.set(uid, f.color);
    }
    return map;
  }, [user, followsQuery.data]);

  const events: CalEvent[] = useMemo(() => {
    const list = rows ?? [];
    const out: CalEvent[] = [];
    for (const r of list) {
      const start = new Date(r.startAt);
      const end = new Date(r.endAt);
      // BE echoes _userIds when the request used userIds. Expand into one
      // chip per attributed user so each toggled user gets their own
      // color/lane. If empty, render once with no attribution.
      const attribution = r._userIds ?? [];
      if (attribution.length === 0) {
        out.push({
          id: r.id,
          eventId: r.id,
          paletteColor: colorByUserId.get(r.ownerId),
          title: r.title,
          start,
          end,
          resource: r,
          allDay: r.isAllDay,
        });
        continue;
      }
      for (const uid of attribution) {
        out.push({
          id: `${r.id}::${uid}`,
          eventId: r.id,
          userId: uid,
          paletteColor: colorByUserId.get(uid),
          title: r.title,
          start,
          end,
          resource: r,
          allDay: r.isAllDay,
        });
      }
    }
    return out;
  }, [rows, colorByUserId]);

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
    // Use eventId — multi-attribution chips carry a suffixed `id` for React
    // keys but share the same underlying Event for detail / mutate.
    setSelectedId(ev.eventId);
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

  // Toggle = add/remove from session-hidden set. Visible state derives
  // from follows, so untick adds to hidden, retick removes from hidden.
  const toggleUser = useCallback((userId: string, on: boolean) => {
    setHiddenUserIds((prev) =>
      on
        ? prev.filter((u) => u !== userId)
        : Array.from(new Set([...prev, userId])),
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

        </div>

        <EventDetailDialog
          event={detail.data ?? null}
          open={!!selectedId && !!detail.data}
          onEdit={() => setCreateOpen(true)}
          onDelete={() => detail.data && onDelete(detail.data.id)}
          onClose={() => setSelectedId(null)}
        />

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
