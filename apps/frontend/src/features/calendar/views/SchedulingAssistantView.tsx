"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

import { EventAttendeesPicker } from "../components/event/EventAttendeesPicker";
import { EventVisibilityField } from "../components/event/EventVisibilityField";
import { RichTextDescriptionField } from "../components/event/RichTextDescriptionField";
import { ResourcePicker } from "../components/resource/ResourcePicker";
import { useCreateEvent, useEvents } from "../hooks/useEvents";
import { useResources } from "../hooks/useResources";
import { userColorFromId } from "../lib/user-color";
import { useEventDraftStore } from "../store/eventDraftStore";
import type { CreateEventAttendeeInput, EventRow } from "../types";

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 22;
const ROW_PX = 28; // px per 30-minute row → ROW_PX / 2 per 15min snap
const SNAP_MINUTES = 15;
const TOTAL_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60;
const PX_PER_MIN = ROW_PX / 30;

interface ColumnParty {
  key: string;
  kind: "user" | "resource";
  id: ID;
  name: string;
  subtitle?: string | null;
  avatar?: string | null;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function stitchDateTime(date: string, time: string): Date | null {
  if (!date) return null;
  const t = time && time.length === 5 ? time : "00:00";
  const dt = new Date(`${date}T${t}`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function clampMinutes(m: number): number {
  return Math.max(0, Math.min(TOTAL_MINUTES, m));
}

function snapMinutes(m: number): number {
  return Math.round(m / SNAP_MINUTES) * SNAP_MINUTES;
}

function minutesFromMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function minutesFromDayStart(d: Date): number {
  return minutesFromMidnight(d) - DAY_START_HOUR * 60;
}

export function SchedulingAssistantView() {
  const router = useRouter();
  const { user } = useAuth();
  const draft = useEventDraftStore((s) => s.draft);
  const setField = useEventDraftStore((s) => s.setField);
  const setOrganizer = useEventDraftStore((s) => s.setOrganizer);
  const reset = useEventDraftStore((s) => s.reset);
  const create = useCreateEvent();

  // Default organizer to current user if empty.
  useEffect(() => {
    if (!draft.organizer && user) {
      setOrganizer({ userId: user.id, name: user.name, email: user.email });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Default startDate to today if empty.
  useEffect(() => {
    if (!draft.startDate) {
      const today = new Date();
      const ymd = formatYmd(today);
      setField("startDate", ymd);
      setField("endDate", ymd);
      if (!draft.startTime) setField("startTime", "09:00");
      if (!draft.endTime) setField("endTime", "10:00");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async () => {
    if (!draft.title.trim()) {
      toast.error("Nhập tên cuộc họp");
      return;
    }
    const isAllDay = draft.isAllDay;
    const start = stitchDateTime(
      draft.startDate,
      isAllDay ? "00:00" : draft.startTime,
    );
    let end = stitchDateTime(
      draft.endDate,
      isAllDay ? "00:00" : draft.endTime,
    );
    if (!start || !end) {
      toast.error("Thời gian không hợp lệ");
      return;
    }
    if (end <= start) {
      toast.error("Kết thúc phải sau bắt đầu");
      return;
    }
    if (isAllDay) {
      end = new Date(end);
      end.setDate(end.getDate() + 1);
    }
    const attendees: CreateEventAttendeeInput[] = [];
    if (draft.organizer) attendees.push({ userId: draft.organizer.userId });
    for (const a of draft.invitees) attendees.push({ userId: a.userId });

    try {
      await create.mutateAsync({
        title: draft.title,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        isAllDay,
        location: draft.location || undefined,
        conferenceUrl: draft.conferenceUrl || undefined,
        description: draft.description || undefined,
        visibility: draft.visibility,
        isPrivate: draft.isPrivate,
        attendees,
        resourceIds:
          draft.resourceIds.length > 0 ? draft.resourceIds : undefined,
      });
      toast.success("Đã tạo sự kiện");
      reset();
      router.push("/calendar/bookings");
    } catch (err) {
      toast.error("Không tạo được sự kiện", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4 px-4 py-3">
      <aside className="flex w-[380px] shrink-0 flex-col overflow-hidden rounded-lg border bg-background shadow-sm">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.back()}
            aria-label="Quay lại"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-semibold">Tìm khung trống</div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
          <FormPane submitting={create.isPending} />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-background px-4 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              router.push("/calendar/bookings");
            }}
          >
            Huỷ
          </Button>
          <Button type="button" onClick={onSubmit} disabled={create.isPending}>
            {create.isPending && (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            )}
            Lưu
          </Button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background shadow-sm">
        <ScheduleGrid
          onSlotChange={(start, end) => {
            const sd = formatYmd(start);
            const ed = formatYmd(end);
            const st = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
            const et = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
            if (draft.startDate !== sd) setField("startDate", sd);
            if (draft.endDate !== ed) setField("endDate", ed);
            if (draft.startTime !== st) setField("startTime", st);
            if (draft.endTime !== et) setField("endTime", et);
          }}
        />
      </main>
    </div>
  );
}

interface FormPaneProps {
  submitting: boolean;
}

function FormPane({ submitting }: FormPaneProps) {
  const draft = useEventDraftStore((s) => s.draft);
  const setField = useEventDraftStore((s) => s.setField);
  const setOrganizer = useEventDraftStore((s) => s.setOrganizer);
  const setResourceIds = useEventDraftStore((s) => s.setResourceIds);

  // We don't run zod here — the dialog has the canonical form. The
  // assistant page validates on submit only.
  const start = stitchDateTime(draft.startDate, draft.startTime);
  const end = stitchDateTime(draft.endDate, draft.endTime);
  const slotStart = start ? start.toISOString() : undefined;
  const slotEnd = end ? end.toISOString() : undefined;

  // Standalone control object — we mirror store fields directly without
  // RHF's full lifecycle (no async submit, no resolver).
  return (
    <div className="space-y-5">
      <div className="grid gap-1.5">
        <Label>Tên cuộc họp</Label>
        <Input
          placeholder="Họp dự án X"
          value={draft.title}
          onChange={(e) => setField("title", e.target.value)}
          disabled={submitting}
        />
      </div>

      <DateTimeStandalone />

      <div className="grid gap-1.5">
        <Label>Địa điểm</Label>
        <Input
          placeholder="Phòng họp A / Online"
          value={draft.location}
          onChange={(e) => setField("location", e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="grid gap-1.5">
        <Label>Link cuộc họp trực tuyến</Label>
        <Input
          type="url"
          placeholder="https://meet.google.com/..."
          value={draft.conferenceUrl}
          onChange={(e) => setField("conferenceUrl", e.target.value)}
          disabled={submitting}
        />
      </div>

      <EventAttendeesPicker
        organizer={draft.organizer}
        onOrganizerChange={setOrganizer}
        invitees={draft.invitees}
        onInviteesChange={(next) => setField("invitees", next)}
        disabled={submitting}
        slotStart={slotStart}
        slotEnd={slotEnd}
      />

      <ResourcePicker
        value={draft.resourceIds}
        onChange={setResourceIds}
        disabled={submitting}
      />

      <div className="grid gap-1.5">
        <Label>Mô tả</Label>
        <RichTextDescriptionField
          value={draft.description}
          onChange={(html) => setField("description", html)}
          disabled={submitting}
        />
      </div>

      <EventVisibilityField
        visibility={draft.visibility}
        onVisibilityChange={(v) => setField("visibility", v)}
        isPrivate={draft.isPrivate}
        onIsPrivateChange={(v) => setField("isPrivate", v)}
        disabled={submitting}
      />
    </div>
  );
}

/**
 * Tiny standalone wrapper around `EventDateTimeRow` that doesn't require
 * a full RHF Control. We emulate the shape by binding directly to the
 * store with native inputs.
 */
function DateTimeStandalone() {
  const draft = useEventDraftStore((s) => s.draft);
  const setField = useEventDraftStore((s) => s.setField);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <div className="grid gap-1.5">
          <Label>Bắt đầu</Label>
          <Input
            type="date"
            value={draft.startDate}
            onChange={(e) => setField("startDate", e.target.value)}
          />
        </div>
        {!draft.isAllDay && (
          <div className="grid gap-1.5">
            <Input
              type="time"
              className="w-28"
              value={draft.startTime}
              onChange={(e) => setField("startTime", e.target.value)}
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <div className="grid gap-1.5">
          <Label>Kết thúc</Label>
          <Input
            type="date"
            value={draft.endDate}
            onChange={(e) => setField("endDate", e.target.value)}
          />
        </div>
        {!draft.isAllDay && (
          <div className="grid gap-1.5">
            <Input
              type="time"
              className="w-28"
              value={draft.endTime}
              onChange={(e) => setField("endTime", e.target.value)}
            />
          </div>
        )}
      </div>
      <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
        <input
          type="checkbox"
          className="size-4"
          checked={draft.isAllDay}
          onChange={(e) => setField("isAllDay", e.target.checked)}
        />
        Cả ngày
      </Label>
    </div>
  );
}

interface ScheduleGridProps {
  onSlotChange: (start: Date, end: Date) => void;
}

function ScheduleGrid({ onSlotChange }: ScheduleGridProps) {
  const draft = useEventDraftStore((s) => s.draft);
  const resources = useResources({ activeOnly: true });

  // viewDate is a *derived* anchor: draft.startDate + a user-controlled
  // day offset. Storing only the offset (instead of a snapshot Date)
  // means the grid auto-follows when the user retypes the date in the
  // form, no useEffect sync needed.
  const [dayOffset, setDayOffset] = useState(0);

  const baseDate = useMemo(() => {
    const d = stitchDateTime(draft.startDate || formatYmd(new Date()), "00:00");
    return d ?? new Date();
  }, [draft.startDate]);

  const viewDate = useMemo(() => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [baseDate, dayOffset]);

  const dayStart = useMemo(() => {
    const d = new Date(viewDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [viewDate]);
  const dayEnd = useMemo(() => {
    const d = new Date(dayStart);
    d.setDate(d.getDate() + 1);
    return d;
  }, [dayStart]);

  const columns = useMemo<ColumnParty[]>(() => {
    const cols: ColumnParty[] = [];
    if (draft.organizer) {
      cols.push({
        key: `u:${draft.organizer.userId}`,
        kind: "user",
        id: draft.organizer.userId,
        name: draft.organizer.name ?? draft.organizer.email,
        subtitle: "Chủ trì",
      });
    }
    for (const a of draft.invitees) {
      cols.push({
        key: `u:${a.userId}`,
        kind: "user",
        id: a.userId,
        name: a.name ?? a.email,
      });
    }
    const resourceById = new Map((resources.data ?? []).map((r) => [r.id, r]));
    for (const id of draft.resourceIds) {
      const r = resourceById.get(id);
      cols.push({
        key: `r:${id}`,
        kind: "resource",
        id,
        name: r?.name ?? "Phòng / tài nguyên",
        subtitle: r?.location ?? null,
      });
    }
    return cols;
  }, [draft.organizer, draft.invitees, draft.resourceIds, resources.data]);

  // Ghost slot — derived from store. Always for the visible day; if the
  // draft starts on another day, ghost is hidden.
  const ghostMinutes = useMemo(() => {
    const start = stitchDateTime(draft.startDate, draft.startTime);
    const end = stitchDateTime(draft.endDate, draft.endTime);
    if (!start || !end) return null;
    const sameDay = formatYmd(start) === formatYmd(viewDate);
    const sameDayEnd = formatYmd(end) === formatYmd(viewDate);
    const startMin = clampMinutes(minutesFromDayStart(start));
    const endMin = clampMinutes(minutesFromDayStart(end));
    if (endMin <= startMin) return null;
    return {
      startMin,
      endMin,
      onlyShowsStart: !sameDay || !sameDayEnd,
      crossDay: !sameDayEnd,
    };
  }, [draft.startDate, draft.startTime, draft.endDate, draft.endTime, viewDate]);

  const goPrev = () => setDayOffset((n) => n - 1);
  const goNext = () => setDayOffset((n) => n + 1);
  const goToday = () => {
    // Snap back to draft.startDate's day (offset 0).
    const today = formatYmd(new Date());
    const baseYmd = formatYmd(baseDate);
    if (today === baseYmd) {
      setDayOffset(0);
      return;
    }
    // baseDate isn't today — compute offset from baseDate to today in days.
    const diffMs =
      new Date(today).getTime() - new Date(baseYmd).getTime();
    setDayOffset(Math.round(diffMs / (24 * 60 * 60 * 1000)));
  };

  if (columns.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <GridHeader
          viewDate={viewDate}
          onPrev={goPrev}
          onNext={goNext}
          onToday={goToday}
        />
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
          Thêm người tham gia hoặc phòng họp để xem lịch của họ.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <GridHeader
        viewDate={viewDate}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
      />
      <GridBody
        columns={columns}
        dayStart={dayStart}
        dayEnd={dayEnd}
        ghostMinutes={ghostMinutes}
        onSlotChange={onSlotChange}
      />
    </div>
  );
}

function GridHeader({
  viewDate,
  onPrev,
  onNext,
  onToday,
}: {
  viewDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
      <Button type="button" variant="outline" size="sm" onClick={onToday}>
        Hôm nay
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onPrev}
        aria-label="Ngày trước"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onNext}
        aria-label="Ngày sau"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <div className="text-sm font-medium capitalize">
        {format(viewDate, "EEEE, dd MMMM yyyy", { locale: vi })}
      </div>
    </div>
  );
}

interface GridBodyProps {
  columns: ColumnParty[];
  dayStart: Date;
  dayEnd: Date;
  ghostMinutes: {
    startMin: number;
    endMin: number;
    onlyShowsStart: boolean;
    crossDay: boolean;
  } | null;
  onSlotChange: (start: Date, end: Date) => void;
}

function GridBody({
  columns,
  dayStart,
  dayEnd,
  ghostMinutes,
  onSlotChange,
}: GridBodyProps) {
  // Per-column event fetches. Each column fires a separate `useEvents`
  // call — same React Query cache key dedup if two columns reference the
  // same userId (e.g. organizer also added as invitee — guarded above).
  const fromIso = dayStart.toISOString();
  const toIso = dayEnd.toISOString();

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <TimeAxis />
      <div className="relative flex-1 overflow-auto">
        <div className="flex min-w-full">
          {columns.map((col) => (
            <Column
              key={col.key}
              col={col}
              fromIso={fromIso}
              toIso={toIso}
              dayStart={dayStart}
              ghostMinutes={ghostMinutes}
            />
          ))}
        </div>
        <Ghost
          ghostMinutes={ghostMinutes}
          dayStart={dayStart}
          onSlotChange={onSlotChange}
        />
      </div>
    </div>
  );
}

function TimeAxis() {
  const rows: number[] = [];
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) rows.push(h);
  return (
    <div className="w-12 shrink-0 border-r bg-muted/10">
      <div className="h-9 border-b" />
      {rows.map((h) => (
        <div
          key={h}
          className="relative border-b text-[10px] text-muted-foreground"
          style={{ height: `${ROW_PX * 2}px` }}
        >
          <span className="absolute -top-1.5 right-1.5">
            {pad(h)}:00
          </span>
        </div>
      ))}
    </div>
  );
}

interface ColumnProps {
  col: ColumnParty;
  fromIso: string;
  toIso: string;
  dayStart: Date;
  ghostMinutes: GridBodyProps["ghostMinutes"];
}

function Column({ col, fromIso, toIso, dayStart, ghostMinutes }: ColumnProps) {
  const isUser = col.kind === "user";
  const eventsQuery = useEvents(
    isUser
      ? { from: fromIso, to: toIso, userIds: [col.id] }
      : { from: fromIso, to: toIso, resourceId: col.id },
  );

  const dayEvents = useMemo<EventRow[]>(() => {
    const rows = eventsQuery.data ?? [];
    const ds = dayStart.getTime();
    const de = ds + 24 * 60 * 60 * 1000;
    return rows.filter((r) => {
      const s = new Date(r.startAt).getTime();
      const e = new Date(r.endAt).getTime();
      return e > ds && s < de;
    });
  }, [eventsQuery.data, dayStart]);

  const tint = userColorFromId(col.id);

  // Free/busy badge: ghost overlaps any event?
  const busy = useMemo(() => {
    if (!ghostMinutes) return false;
    return dayEvents.some((r) => {
      const s = clampMinutes(
        minutesFromDayStart(new Date(r.startAt)),
      );
      const e = clampMinutes(minutesFromDayStart(new Date(r.endAt)));
      return e > ghostMinutes.startMin && s < ghostMinutes.endMin;
    });
  }, [dayEvents, ghostMinutes]);

  // Edge: AttendeeDraft has userId but the user might not have an
  // employee record / accessible calendar — manifested as 403/empty.
  const noData =
    !eventsQuery.isLoading && eventsQuery.isError && isUser;

  return (
    <div className="relative flex-1 min-w-35 border-r last:border-r-0">
      <div
        className="sticky top-0 z-10 flex h-9 items-center gap-2 border-b bg-background/95 px-2 backdrop-blur"
        style={{ boxShadow: `inset 3px 0 0 ${tint}` }}
      >
        <Avatar size="sm">
          <AvatarImage alt={col.name} />
          <AvatarFallback>
            {col.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div
            className="truncate text-xs font-medium leading-tight"
            title={col.name}
          >
            {col.name}
          </div>
          {col.subtitle && (
            <div className="truncate text-[10px] leading-tight text-muted-foreground">
              {col.subtitle}
            </div>
          )}
        </div>
        {ghostMinutes && (
          <Badge
            variant="outline"
            className={cn(
              "h-5 px-1.5 text-[10px]",
              busy
                ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
            )}
          >
            {busy ? "Bận" : "Rảnh"}
          </Badge>
        )}
      </div>

      <div
        className="relative bg-background"
        style={{
          height: `${(DAY_END_HOUR - DAY_START_HOUR) * ROW_PX * 2}px`,
        }}
      >
        {/* 30-min snap lines */}
        <GridLines />

        {noData ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            —
          </div>
        ) : eventsQuery.isLoading ? (
          <div className="absolute inset-x-0 top-2 flex justify-center">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          </div>
        ) : (
          dayEvents.map((ev) => (
            <ColumnEventBlock
              key={ev.id}
              ev={ev}
              dayStart={dayStart}
              tint={tint}
            />
          ))
        )}
      </div>
    </div>
  );
}

function GridLines() {
  const lines: number[] = [];
  for (let m = 0; m <= TOTAL_MINUTES; m += 30) lines.push(m);
  return (
    <>
      {lines.map((m) => (
        <div
          key={m}
          className={cn(
            "pointer-events-none absolute inset-x-0 border-b",
            m % 60 === 0 ? "border-border" : "border-border/40",
          )}
          style={{ top: `${m * PX_PER_MIN}px` }}
        />
      ))}
    </>
  );
}

function ColumnEventBlock({
  ev,
  dayStart,
  tint,
}: {
  ev: EventRow;
  dayStart: Date;
  tint: string;
}) {
  const start = new Date(ev.startAt);
  const end = new Date(ev.endAt);
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;
  const clampedStart = Math.max(start.getTime(), dayStartMs);
  const clampedEnd = Math.min(end.getTime(), dayEndMs);
  const startMin = clampMinutes(
    (clampedStart - dayStartMs) / 60_000 - DAY_START_HOUR * 60,
  );
  const endMin = clampMinutes(
    (clampedEnd - dayStartMs) / 60_000 - DAY_START_HOUR * 60,
  );
  if (endMin <= startMin) return null;
  const top = startMin * PX_PER_MIN;
  const height = Math.max(14, (endMin - startMin) * PX_PER_MIN - 1);
  const palette = ev.color ?? tint;

  const startLabel = format(start, "HH:mm");
  const endLabel = format(end, "HH:mm");
  const crossDay = formatYmd(start) !== formatYmd(end);

  return (
    <div
      className="absolute left-0.5 right-0.5 overflow-hidden rounded border px-1.5 py-0.5 text-[10px] leading-tight"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: `color-mix(in oklab, ${palette} 22%, var(--background))`,
        borderColor: palette,
      }}
      title={
        crossDay
          ? `${ev.title} (kéo dài nhiều ngày)`
          : `${ev.title} · ${startLabel}–${endLabel}`
      }
    >
      <div className="truncate font-semibold text-foreground">{ev.title}</div>
      <div className="truncate tabular-nums text-muted-foreground">
        {startLabel}–{endLabel}
      </div>
    </div>
  );
}

interface GhostProps {
  ghostMinutes: GridBodyProps["ghostMinutes"];
  dayStart: Date;
  onSlotChange: (start: Date, end: Date) => void;
}

type DragMode = "move" | "resize-top" | "resize-bottom";

function Ghost({ ghostMinutes, dayStart, onSlotChange }: GhostProps) {
  // beginDrag re-creates on every relevant prop change so its closure
  // always reads fresh ghostMinutes / dayStart / onSlotChange — no refs
  // needed. The drag itself is one-shot (mousedown → mouseup) so the
  // closure lifetime is short.
  const beginDrag = useCallback(
    (mode: DragMode, e: React.MouseEvent) => {
      if (!ghostMinutes) return;
      e.preventDefault();
      e.stopPropagation();
      const pointerStartY = e.clientY;
      const initialStartMin = ghostMinutes.startMin;
      const initialEndMin = ghostMinutes.endMin;
      const duration = initialEndMin - initialStartMin;

      const minutesToDate = (mins: number) => {
        const d = new Date(dayStart);
        d.setHours(DAY_START_HOUR, 0, 0, 0);
        d.setMinutes(d.getMinutes() + mins);
        return d;
      };

      const onMove = (ev: MouseEvent) => {
        const dy = ev.clientY - pointerStartY;
        const dMin = snapMinutes(dy / PX_PER_MIN);
        let nextStart = initialStartMin;
        let nextEnd = initialEndMin;

        if (mode === "move") {
          nextStart = clampMinutes(initialStartMin + dMin);
          nextEnd = nextStart + duration;
          if (nextEnd > TOTAL_MINUTES) {
            nextEnd = TOTAL_MINUTES;
            nextStart = nextEnd - duration;
          }
        } else if (mode === "resize-top") {
          nextStart = clampMinutes(initialStartMin + dMin);
          if (nextStart > nextEnd - SNAP_MINUTES) {
            nextStart = nextEnd - SNAP_MINUTES;
          }
        } else {
          nextEnd = clampMinutes(initialEndMin + dMin);
          if (nextEnd < nextStart + SNAP_MINUTES) {
            nextEnd = nextStart + SNAP_MINUTES;
          }
        }

        onSlotChange(minutesToDate(nextStart), minutesToDate(nextEnd));
      };

      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [ghostMinutes, dayStart, onSlotChange],
  );

  if (!ghostMinutes) return null;

  const top = ghostMinutes.startMin * PX_PER_MIN;
  const height = Math.max(
    SNAP_MINUTES * PX_PER_MIN,
    (ghostMinutes.endMin - ghostMinutes.startMin) * PX_PER_MIN,
  );

  return (
    <div
      data-ghost
      className="pointer-events-none absolute inset-x-0 z-20"
      style={{ top: `${36 + top}px`, height: `${height}px` }}
    >
      <div
        className="pointer-events-auto relative h-full w-full cursor-move border-2 border-dashed border-foreground/40 bg-muted/40 backdrop-blur-sm"
        onMouseDown={(e) => beginDrag("move", e)}
        title="Kéo để dời, kéo viền trên/dưới để thay đổi độ dài"
      >
        <div
          className="absolute inset-x-0 top-0 h-2 cursor-ns-resize"
          onMouseDown={(e) => beginDrag("resize-top", e)}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
          onMouseDown={(e) => beginDrag("resize-bottom", e)}
        />
        <div className="pointer-events-none absolute left-2 top-1 text-[10px] font-semibold tabular-nums text-foreground/80">
          {pad(Math.floor(ghostMinutes.startMin / 60) + DAY_START_HOUR)}:
          {pad(ghostMinutes.startMin % 60)}
          {" – "}
          {pad(Math.floor(ghostMinutes.endMin / 60) + DAY_START_HOUR)}:
          {pad(ghostMinutes.endMin % 60)}
          {ghostMinutes.crossDay && (
            <span className="ml-1 italic text-muted-foreground">
              (qua ngày)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
