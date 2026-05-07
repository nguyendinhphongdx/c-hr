"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageContainer } from "@/components/layout/PageContainer";
import { useDepartments } from "@/features/departments";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

import { CalendarTabs } from "../components/CalendarTabs";
import { EventCreateDialog } from "../components/EventCreateDialog";
import { EventDetailDialog } from "../components/EventDetailDialog";
import { useEvent, useEvents, useDeleteEvent } from "../hooks/useEvents";
import { useResources } from "../hooks/useResources";
import { useTickingNow } from "../hooks/useTickingNow";
import { formatDateParam, parseDateParam } from "../lib/format";
import { userColorFromId } from "../lib/user-color";
import type { EventRow, ResourceRow } from "../types";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_MS = 24 * 60 * 60 * 1000;
const SLOT_MIN = 30; // drag-to-create snap
const NO_DEPT_KEY = "__none__";
const NO_DEPT_LABEL = "Khác";

interface DragState {
  roomId: ID;
  /** Bounding rect of the row at drag-start, captured for movement math. */
  rowRect: DOMRect;
  /** Pixel x where the drag started, relative to the row. */
  startX: number;
  /** Pixel x of the latest pointer position, relative to the row. */
  endX: number;
}

function dayBoundsLocal(d: Date): { start: Date; end: Date } {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(start.getTime() + DAY_MS);
  return { start, end };
}

/** % of day [0..100] for a Date clamped to [dayStart, dayEnd]. */
function pctOfDay(t: Date, dayStart: Date): number {
  const ms = t.getTime() - dayStart.getTime();
  return Math.max(0, Math.min(100, (ms / DAY_MS) * 100));
}

/** Snap a pixel-x within row to a Date on the selected day at 30-min steps. */
function pxToSnappedDate(
  x: number,
  rowWidth: number,
  dayStart: Date,
): Date {
  const pct = Math.max(0, Math.min(1, x / Math.max(1, rowWidth)));
  const minutes = Math.round((pct * 24 * 60) / SLOT_MIN) * SLOT_MIN;
  const clamped = Math.max(0, Math.min(24 * 60, minutes));
  return new Date(dayStart.getTime() + clamped * 60_000);
}

function formatDateLabel(d: Date): string {
  const wk = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  return `${wk[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

interface RoomGroup {
  key: string;
  label: string;
  rooms: ResourceRow[];
}

function groupRooms(
  rooms: ResourceRow[],
  deptNameById: Map<ID, string>,
): RoomGroup[] {
  const groups = new Map<string, RoomGroup>();
  for (const r of rooms) {
    const id = r.managingDepartmentId ?? null;
    const key = id ?? NO_DEPT_KEY;
    const label = id
      ? (deptNameById.get(id) ?? r.managingDepartment?.name ?? NO_DEPT_LABEL)
      : NO_DEPT_LABEL;
    if (!groups.has(key)) groups.set(key, { key, label, rooms: [] });
    groups.get(key)!.rooms.push(r);
  }
  // Stable sort: real depts (a–z), "Khác" last; rooms by name within group.
  const arr = Array.from(groups.values());
  arr.sort((a, b) => {
    if (a.key === NO_DEPT_KEY) return 1;
    if (b.key === NO_DEPT_KEY) return -1;
    return a.label.localeCompare(b.label);
  });
  for (const g of arr) g.rooms.sort((a, b) => a.name.localeCompare(b.name));
  return arr;
}

/** Bookings for a single room — filter the shared day-events list. */
function eventsForRoom(events: EventRow[], roomId: ID): EventRow[] {
  return events.filter((e) =>
    (e.resources ?? []).some((r) => r.resourceId === roomId),
  );
}

export function RoomsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const now = useTickingNow();

  // ── Day state via ?d=YYYY-MM-DD ─────────────────────────────────
  const day = useMemo(
    () => parseDateParam(searchParams.get("d")) ?? new Date(),
    [searchParams],
  );
  const { start: dayStart, end: dayEnd } = useMemo(
    () => dayBoundsLocal(day),
    [day],
  );
  const isToday = useMemo(() => {
    const t = new Date();
    return (
      t.getFullYear() === day.getFullYear() &&
      t.getMonth() === day.getMonth() &&
      t.getDate() === day.getDate()
    );
  }, [day, now]); // eslint-disable-line react-hooks/exhaustive-deps

  const setDay = useCallback(
    (next: Date) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("d", formatDateParam(next));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );
  const goPrev = () => {
    const next = new Date(day);
    next.setDate(next.getDate() - 1);
    setDay(next);
  };
  const goNext = () => {
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    setDay(next);
  };

  // ── Data ─────────────────────────────────────────────────────────
  const rooms = useResources({ kind: "ROOM", activeOnly: true });
  const departments = useDepartments();
  const events = useEvents({
    from: dayStart.toISOString(),
    to: dayEnd.toISOString(),
  });

  const deptNameById = useMemo(() => {
    const m = new Map<ID, string>();
    for (const d of departments.data ?? []) m.set(d.id, d.name);
    return m;
  }, [departments.data]);

  const groups = useMemo(
    () => groupRooms(rooms.data ?? [], deptNameById),
    [rooms.data, deptNameById],
  );

  // ── Drag-to-create ──────────────────────────────────────────────
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSlot, setCreateSlot] = useState<{
    roomId: ID;
    start: string;
    end: string;
  } | null>(null);

  // ── Event detail open ──────────────────────────────────────────
  const [selectedEventId, setSelectedEventId] = useState<ID | null>(null);
  const detail = useEvent(selectedEventId);
  const deleteEvent = useDeleteEvent();
  const onDeleteEvent = useCallback(
    async (id: ID) => {
      await deleteEvent.mutateAsync(id);
      setSelectedEventId(null);
    },
    [deleteEvent],
  );

  const onRowMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, roomId: ID) => {
      // Only left button, only direct row clicks (skip event chips).
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest("[data-event-chip]")) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const next: DragState = {
        roomId,
        rowRect: rect,
        startX,
        endX: startX,
      };
      setDrag(next);
      dragRef.current = next;

      const onMove = (ev: MouseEvent) => {
        const rel = Math.max(
          0,
          Math.min(rect.width, ev.clientX - rect.left),
        );
        const updated = { ...dragRef.current!, endX: rel };
        dragRef.current = updated;
        setDrag(updated);
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        const d = dragRef.current;
        dragRef.current = null;
        setDrag(null);
        if (!d) return;
        const a = Math.min(d.startX, d.endX);
        const b = Math.max(d.startX, d.endX);
        // Ignore tiny clicks (treat as no-op rather than 0-min booking).
        if (b - a < 4) return;
        const start = pxToSnappedDate(a, d.rowRect.width, dayStart);
        let end = pxToSnappedDate(b, d.rowRect.width, dayStart);
        if (end.getTime() === start.getTime()) {
          end = new Date(start.getTime() + SLOT_MIN * 60_000);
        }
        setCreateSlot({
          roomId: d.roomId,
          start: start.toISOString(),
          end: end.toISOString(),
        });
        setCreateOpen(true);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [dayStart],
  );

  // Now-line position (only when viewing today).
  const nowPct = isToday ? pctOfDay(now, dayStart) : null;

  const loading = rooms.isLoading || departments.isLoading;
  const noRooms = !loading && (rooms.data ?? []).length === 0;

  return (
    <PageContainer variant="bleed" className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarTabs />
          <span className="hidden h-6 w-px bg-border md:inline-block" />
          <Button variant="outline" size="sm" onClick={() => setDay(new Date())}>
            Hôm nay
          </Button>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={goPrev}
              aria-label="Ngày trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={goNext}
              aria-label="Ngày sau"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <DayPicker day={day} onChange={setDay} />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {events.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span>{(rooms.data ?? []).length} phòng</span>
        </div>
      </header>

      <div className="rounded-lg border bg-background shadow-sm">
        {/* Time axis row */}
        <div className="grid grid-cols-[200px_1fr] border-b">
          <div className="border-r bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Phòng họp
          </div>
          <div className="relative">
            <div
              className="grid h-9 text-[10px] text-muted-foreground"
              style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
            >
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="flex items-center justify-start border-l px-1 first:border-l-0"
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : noRooms ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            Chưa có phòng họp nào — thêm trong{" "}
            <span className="font-medium text-foreground">Tài nguyên</span>.
          </div>
        ) : (
          <div className="relative">
            {nowPct !== null && (
              <NowLineOverlay nowPct={nowPct} />
            )}
            {groups.map((g) => (
              <div key={g.key}>
                <div className="grid grid-cols-[200px_1fr] border-b bg-muted/30">
                  <div className="border-r px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {g.label}
                  </div>
                  <div />
                </div>
                {g.rooms.map((room) => {
                  const roomEvents = eventsForRoom(events.data ?? [], room.id);
                  const dragOnThisRow = drag && drag.roomId === room.id;
                  return (
                    <div
                      key={room.id}
                      className="grid grid-cols-[200px_1fr] border-b last:border-b-0"
                    >
                      <div className="flex flex-col justify-center border-r px-3 py-2">
                        <span className="truncate text-sm font-medium">
                          {room.name}
                        </span>
                        {room.location && (
                          <span className="truncate text-[11px] text-muted-foreground">
                            {room.location}
                          </span>
                        )}
                      </div>
                      <div
                        data-room-id={room.id}
                        onMouseDown={(e) => onRowMouseDown(e, room.id)}
                        className="relative h-12 cursor-crosshair select-none"
                      >
                        {/* hour gridlines */}
                        <div
                          className="pointer-events-none absolute inset-0 grid"
                          style={{
                            gridTemplateColumns: "repeat(24, minmax(0, 1fr))",
                          }}
                        >
                          {HOURS.map((h) => (
                            <div
                              key={h}
                              className="border-l first:border-l-0"
                            />
                          ))}
                        </div>
                        {/* event chips */}
                        {roomEvents.map((ev) => (
                          <EventBlock
                            key={ev.id}
                            ev={ev}
                            dayStart={dayStart}
                            onOpen={() => setSelectedEventId(ev.id)}
                          />
                        ))}
                        {/* drag ghost */}
                        {dragOnThisRow && (
                          <DragGhost drag={drag!} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
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
        // Pre-select the room as a resource. EventCreateDialog reads
        // initialResourceIds via its own state (see useEffect on `open`).
        initialResourceIds={createSlot ? [createSlot.roomId] : undefined}
      />

      <EventDetailDialog
        event={detail.data ?? null}
        open={!!selectedEventId && !!detail.data}
        onEdit={() => setCreateOpen(true)}
        onDelete={() => detail.data && onDeleteEvent(detail.data.id)}
        onClose={() => setSelectedEventId(null)}
      />
    </PageContainer>
  );
}

function NowLineOverlay({ nowPct }: { nowPct: number }) {
  return (
    <div className="pointer-events-none absolute inset-y-0 left-[200px] right-0 z-10">
      <div
        className="absolute top-0 bottom-0 w-px bg-red-500"
        style={{ left: `${nowPct}%` }}
      >
        <span className="absolute -top-1 -left-1 block h-2 w-2 rounded-full bg-red-500" />
      </div>
    </div>
  );
}

function EventBlock({
  ev,
  dayStart,
  onOpen,
}: {
  ev: EventRow;
  dayStart: Date;
  onOpen: () => void;
}) {
  const start = new Date(ev.startAt);
  const end = new Date(ev.endAt);
  const leftPct = pctOfDay(start, dayStart);
  const rightPct = pctOfDay(end, dayStart);
  const widthPct = Math.max(0.5, rightPct - leftPct);
  const organizer =
    ev.attendees.find((a) => a.isOrganizer)?.user?.name ??
    ev.owner?.name ??
    null;
  const palette =
    ev.color ??
    ev.resources?.[0]?.resource.color ??
    userColorFromId(ev.ownerId);
  const cancelled = ev.status === "CANCELLED";

  return (
    <Tooltip delayDuration={250}>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-event-chip
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            "group absolute top-1 bottom-1 flex flex-col items-stretch overflow-hidden rounded-md border text-left text-[11px] leading-tight shadow-sm transition-all hover:z-10 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            cancelled && "opacity-60",
          )}
          style={{
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            backgroundColor: `color-mix(in oklab, ${palette} 22%, var(--background))`,
            borderColor: palette,
          }}
        >
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1 rounded-l-md"
            style={{ backgroundColor: palette }}
          />
          <div className="flex h-full flex-col justify-center gap-0.5 px-2 pl-3">
            <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
              {formatHm(start)} – {formatHm(end)}
            </span>
            <span
              className={cn(
                "truncate font-semibold text-foreground",
                cancelled && "line-through",
              )}
            >
              {ev.title}
            </span>
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-0.5">
          <div className="font-medium">{ev.title}</div>
          {organizer && (
            <div className="text-xs text-muted-foreground">
              Tổ chức: {organizer}
            </div>
          )}
          <div className="text-xs text-muted-foreground tabular-nums">
            {formatHm(start)} – {formatHm(end)}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function DragGhost({ drag }: { drag: DragState }) {
  const left = Math.min(drag.startX, drag.endX);
  const width = Math.abs(drag.endX - drag.startX);
  return (
    <div
      className="pointer-events-none absolute top-1 bottom-1 rounded-sm border border-primary/60 bg-primary/20"
      style={{ left, width }}
    />
  );
}

function DayPicker({
  day,
  onChange,
}: {
  day: Date;
  onChange: (d: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {formatDateLabel(day)}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={day}
          onSelect={(d) => {
            if (!d) return;
            onChange(d);
            setOpen(false);
          }}
          weekStartsOn={1}
        />
      </PopoverContent>
    </Popover>
  );
}

function formatHm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
