"use client";

import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock,
  Coffee,
  FileText,
  Hourglass,
  LogOut,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuth, useIsAppAdmin } from "@/features/auth";
import { EmployeePicker, useEmployee } from "@/features/employees";
import {
  RequestCreateDialog,
  RequestPreview,
  useRequest,
  useRequests,
  type RequestRow,
  type RequestStatus,
} from "@/features/requests";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

import { useTimesheet } from "../hooks/useTimesheet";
import type { DayStatus, TimesheetDay } from "../types";

const STATUS_CLASSES: Record<DayStatus, string> = {
  PRESENT:
    "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/60",
  LATE: "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/60",
  EARLY_LEAVE:
    "bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-800/60",
  ABSENT: "bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800/60",
  WEEKEND: "bg-muted/40 border-border",
};

const STATUS_LABEL: Record<DayStatus, string> = {
  PRESENT: "Đúng giờ",
  LATE: "Trễ",
  EARLY_LEAVE: "Về sớm",
  ABSENT: "Vắng",
  WEEKEND: "Off",
};

const STATUS_ICON: Record<DayStatus, LucideIcon> = {
  PRESENT: CircleCheck,
  LATE: Clock,
  EARLY_LEAVE: LogOut,
  ABSENT: CircleX,
  WEEKEND: Coffee,
};

const STATUS_BADGE_CLASSES: Record<DayStatus, string> = {
  PRESENT:
    "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/40 dark:text-emerald-300",
  LATE:
    "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/40 dark:text-amber-300",
  EARLY_LEAVE:
    "border-orange-300 bg-orange-100 text-orange-700 dark:border-orange-800/60 dark:bg-orange-900/40 dark:text-orange-300",
  ABSENT:
    "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800/60 dark:bg-rose-900/40 dark:text-rose-300",
  WEEKEND:
    "border-border bg-muted text-muted-foreground",
};

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function formatHHMM(value: string | null): string {
  if (!value) return "--:--";
  const d = new Date(value);
  // Local time (browser tz) — BE stores UTC but user expects wall-clock.
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function workedDuration(checkInAt: string | null, checkOutAt: string | null): string | null {
  if (!checkInAt || !checkOutAt) return null;
  const ms = new Date(checkOutAt).getTime() - new Date(checkInAt).getTime();
  if (ms <= 0) return null;
  const total = Math.floor(ms / 60_000);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/**
 * When the Org has no schedule configured, every day comes back as
 * WEEKEND. If the user has logs that day, surface PRESENT instead so
 * the cell isn't a confusing blank. With a schedule, trust the BE.
 */
function deriveDisplayStatus(day: TimesheetDay): DayStatus {
  if (day.status !== "WEEKEND") return day.status;
  if (day.checkInAt || day.checkOutAt) return "PRESENT";
  return "WEEKEND";
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Status badge + "+" button are CTAs for actionable days. Click opens
 *  the RequestCreateDialog inline (group picker step) with the date
 *  pre-seeded. When approved, the side-effect registry upserts
 *  AttendanceLog so the cell auto-refreshes (useApproveRequest
 *  invalidates `["timesheet"]`). */
const ACTIONABLE_STATUSES: ReadonlySet<DayStatus> = new Set<DayStatus>([
  "LATE",
  "EARLY_LEAVE",
  "ABSENT",
]);

/** Higher number = takes precedence when a day has multiple requests.
 *  APPROVED > PENDING > REJECTED — CANCELLED is excluded (treated as
 *  "no request" for the indicator). */
const REQUEST_PRIORITY: Record<RequestStatus, number> = {
  APPROVED: 3,
  PENDING: 2,
  REJECTED: 1,
  CANCELLED: 0,
};

const REQUEST_INDICATOR_CLASSES: Record<RequestStatus, string> = {
  APPROVED:
    "text-emerald-700 dark:text-emerald-400",
  PENDING:
    "text-amber-700 dark:text-amber-400",
  REJECTED:
    "text-rose-700 dark:text-rose-400",
  CANCELLED: "",
};

const REQUEST_INDICATOR_LABEL: Record<RequestStatus, string> = {
  APPROVED: "Đơn đã duyệt",
  PENDING: "Đơn chờ duyệt",
  REJECTED: "Đơn bị từ chối",
  CANCELLED: "",
};

/** Date string(s) that a request "covers" for the timesheet overlay.
 *  - `checkin` / `checkout`: single `data.date`
 *  - `leave`: range `[data.startDate, data.endDate]` inclusive
 *  Custom groups fall through to single `data.date` when present. */
function extractRequestDates(r: RequestRow): string[] {
  const code = r.group.code;
  if (code === "leave") {
    const start = r.data.startDate;
    const end = r.data.endDate ?? r.data.startDate;
    if (typeof start !== "string" || typeof end !== "string") return [];
    if (start === end) return [start];
    const out: string[] = [];
    const s = new Date(`${start}T00:00:00Z`);
    const e = new Date(`${end}T00:00:00Z`);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return [];
    for (const d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }
  const single = r.data.date;
  return typeof single === "string" ? [single] : [];
}

interface MonthStats {
  present: number;
  late: number;
  earlyLeave: number;
  absent: number;
  weekend: number;
  workdays: number;
  workedMinutes: number;
}

function computeStats(days: TimesheetDay[]): MonthStats {
  const stats: MonthStats = {
    present: 0,
    late: 0,
    earlyLeave: 0,
    absent: 0,
    weekend: 0,
    workdays: 0,
    workedMinutes: 0,
  };
  for (const d of days) {
    const status = deriveDisplayStatus(d);
    if (status !== "WEEKEND") stats.workdays += 1;
    switch (status) {
      case "PRESENT":
        stats.present += 1;
        break;
      case "LATE":
        stats.late += 1;
        break;
      case "EARLY_LEAVE":
        stats.earlyLeave += 1;
        break;
      case "ABSENT":
        stats.absent += 1;
        break;
      case "WEEKEND":
        stats.weekend += 1;
        break;
    }
    if (d.checkInAt && d.checkOutAt) {
      const ms =
        new Date(d.checkOutAt).getTime() - new Date(d.checkInAt).getTime();
      if (ms > 0) stats.workedMinutes += Math.floor(ms / 60_000);
    }
  }
  return stats;
}

function formatHours(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, "0")}m`;
}

interface StatTile {
  key: string;
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  className: string;
}

function StatsRow({ stats, loading }: { stats: MonthStats; loading: boolean }) {
  const tiles: StatTile[] = [
    {
      key: "present",
      label: "Đúng giờ",
      value: stats.present,
      hint: `/ ${stats.workdays} ngày làm việc`,
      icon: CircleCheck,
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    {
      key: "late",
      label: "Trễ",
      value: stats.late,
      icon: Clock,
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300",
    },
    {
      key: "early",
      label: "Về sớm",
      value: stats.earlyLeave,
      icon: LogOut,
      className:
        "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/60 dark:bg-orange-950/40 dark:text-orange-300",
    },
    {
      key: "absent",
      label: "Vắng",
      value: stats.absent,
      icon: CircleX,
      className:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300",
    },
    {
      key: "hours",
      label: "Tổng giờ làm",
      value: formatHours(stats.workedMinutes),
      hint:
        stats.workdays > 0
          ? `TB ${formatHours(Math.floor(stats.workedMinutes / stats.workdays))}/ngày`
          : undefined,
      icon: Hourglass,
      className:
        "border-border bg-muted/30 text-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
      {tiles.map((t) => (
        <div
          key={t.key}
          className={cn(
            "flex items-center gap-2 rounded-md border px-2.5 py-1.5",
            t.className,
          )}
        >
          <t.icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] uppercase tracking-wide opacity-70">
                {t.label}
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {loading ? "—" : t.value}
              </span>
            </div>
            {t.hint && !loading && (
              <div className="truncate text-[10px] opacity-60">{t.hint}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Parse `?ym=YYYY-MM` → { year, month }. Falls back to current month
 *  when missing or malformed so the URL is the single source of truth
 *  but we never crash on garbage input. */
function parseYm(raw: string | null): { year: number; month: number } {
  const now = new Date();
  if (raw) {
    const m = /^(\d{4})-(\d{1,2})$/.exec(raw);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      if (mo >= 1 && mo <= 12) return { year: y, month: mo };
    }
  }
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function formatYm(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function TimesheetView() {
  const { user } = useAuth();
  const canPickOther = useIsAppAdmin("HRM");

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { year, month } = parseYm(searchParams.get("ym"));

  // HRM admins can override the viewed employee via `?e=<id>`. Regular
  // users always see their own row regardless of URL.
  const ownEmployeeId = user?.employeeId ?? null;
  const overrideId = searchParams.get("e");
  const selectedEmployeeId: ID | null = canPickOther
    ? (overrideId ?? ownEmployeeId)
    : ownEmployeeId;

  const employee = useEmployee(selectedEmployeeId);
  const sheet = useTimesheet(selectedEmployeeId, year, month);

  // Track which day's cell triggered the "Tạo đơn" dialog. Set on click,
  // cleared on close. RequestCreateDialog reads `prefill.date` and opens
  // at the group picker step with the date seeded into `data`.
  const [createDate, setCreateDate] = useState<string | null>(null);
  // ID of request opened in the "Xem đơn" preview dialog (click footer
  // indicator). Null = dialog closed.
  const [viewRequestId, setViewRequestId] = useState<ID | null>(null);
  const viewRequest = useRequest(viewRequestId);

  // Only pull "mine" requests when viewing own sheet — HR viewing
  // someone else's sheet doesn't need (or have permission for) the
  // indicator. Saves a query and avoids a confusing UX.
  const isOwnSheet = selectedEmployeeId === ownEmployeeId;
  const myRequests = useRequests(isOwnSheet ? { scope: "mine" } : {});
  const requestByDate = useMemo(() => {
    const map = new Map<string, { id: ID; status: RequestStatus }>();
    if (!isOwnSheet || !myRequests.data) return map;
    for (const r of myRequests.data) {
      if (REQUEST_PRIORITY[r.status] === 0) continue;
      for (const d of extractRequestDates(r)) {
        const cur = map.get(d);
        if (!cur || REQUEST_PRIORITY[r.status] > REQUEST_PRIORITY[cur.status]) {
          map.set(d, { id: r.id, status: r.status });
        }
      }
    }
    return map;
  }, [isOwnSheet, myRequests.data]);

  const stats = useMemo(() => computeStats(sheet.data?.days ?? []), [sheet.data?.days]);
  // `isPlaceholderData` is true while a refetch (employee/month switch)
  // is in flight and we're showing the previous result. Drives the
  // subtle dim/cursor change so the user knows new data is coming.
  const isRefetching = sheet.isPlaceholderData && sheet.isFetching;
  const hasData = !!sheet.data;

  const updateParams = (mutate: (p: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const navigateTo = (y: number, mo: number) =>
    updateParams((p) => p.set("ym", formatYm(y, mo)));

  const goPrev = () => {
    if (month === 1) navigateTo(year - 1, 12);
    else navigateTo(year, month - 1);
  };
  const goNext = () => {
    if (month === 12) navigateTo(year + 1, 1);
    else navigateTo(year, month + 1);
  };

  const onPickEmployee = (id: ID | null) => {
    updateParams((p) => {
      if (!id || id === ownEmployeeId) p.delete("e");
      else p.set("e", id);
    });
  };

  if (!selectedEmployeeId) {
    return (
      <PageContainer>
        <p className="text-sm text-muted-foreground">
          Tài khoản chưa được link với hồ sơ Employee — liên hệ HRM admin.
        </p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bảng giờ làm</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lịch chấm công của{" "}
            <span className="font-medium text-foreground">
              {employee.data?.user?.name ?? "…"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canPickOther && (
            <div className="w-64">
              <EmployeePicker
                value={selectedEmployeeId}
                onChange={onPickEmployee}
                placeholder="Chọn nhân viên…"
              />
            </div>
          )}
          <Button variant="outline" size="icon" onClick={goPrev} aria-label="Tháng trước">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium">
            Tháng {month}/{year}
          </span>
          <Button variant="outline" size="icon" onClick={goNext} aria-label="Tháng sau">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <StatsRow stats={stats} loading={!hasData && sheet.isLoading} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="inline-flex items-center gap-2">
              {sheet.data?.workSchedule?.name ?? "Chưa cấu hình lịch"}
              {isRefetching && (
                <span className="text-[11px] font-normal text-muted-foreground">
                  Đang đồng bộ…
                </span>
              )}
            </span>
            <Legend />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sheet.error ? (
            <p className="py-6 text-sm text-destructive">
              Không tải được bảng giờ làm.
            </p>
          ) : (
            <div
              aria-busy={sheet.isFetching || undefined}
              className={cn(
                "transition-opacity",
                isRefetching && "opacity-60",
              )}
            >
              {hasData ? (
                <CalendarGrid
                  days={sheet.data!.days}
                  canCreateRequest={isOwnSheet}
                  onCreateRequest={setCreateDate}
                  onViewRequest={setViewRequestId}
                  requestByDate={requestByDate}
                />
              ) : (
                <CalendarSkeleton year={year} month={month} />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <RequestCreateDialog
        open={!!createDate}
        onClose={() => setCreateDate(null)}
        prefill={createDate ? { date: createDate } : undefined}
      />

      <Dialog
        open={!!viewRequestId}
        onOpenChange={(o) => !o && setViewRequestId(null)}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <RequestPreview request={viewRequest.data ?? null} />
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function CalendarGrid({
  days,
  canCreateRequest,
  onCreateRequest,
  onViewRequest,
  requestByDate,
}: {
  days: TimesheetDay[];
  canCreateRequest: boolean;
  onCreateRequest: (date: string) => void;
  onViewRequest: (id: ID) => void;
  requestByDate: Map<string, { id: ID; status: RequestStatus }>;
}) {
  if (days.length === 0) return null;
  const today = todayKey();

  // Pad the front so day 1 lands on the right ISO weekday column.
  const first = new Date(days[0].date + "T00:00:00Z");
  const last = new Date(days[days.length - 1].date + "T00:00:00Z");
  const isoFirst = first.getUTCDay() === 0 ? 7 : first.getUTCDay();
  const padFront = isoFirst - 1;

  type Cell =
    | { kind: "day"; day: TimesheetDay }
    | { kind: "outside"; key: string; dayNum: number };

  const cells: Cell[] = [];
  for (let i = padFront; i > 0; i--) {
    const d = new Date(first);
    d.setUTCDate(d.getUTCDate() - i);
    cells.push({ kind: "outside", key: `pre_${i}`, dayNum: d.getUTCDate() });
  }
  for (const day of days) cells.push({ kind: "day", day });
  let postOffset = 1;
  while (cells.length % 7 !== 0) {
    const d = new Date(last);
    d.setUTCDate(d.getUTCDate() + postOffset);
    cells.push({
      kind: "outside",
      key: `post_${postOffset}`,
      dayNum: d.getUTCDate(),
    });
    postOffset++;
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground">
        {DAY_LABELS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((cell) =>
          cell.kind === "day" ? (
            <DayCell
              key={cell.day.date}
              day={cell.day}
              isToday={cell.day.date === today}
              canCreateRequest={canCreateRequest}
              onCreateRequest={onCreateRequest}
              onViewRequest={onViewRequest}
              requestRef={requestByDate.get(cell.day.date) ?? null}
            />
          ) : (
            <div
              key={cell.key}
              className="min-h-28 rounded-md border border-border/40 bg-muted/20 p-2 text-xs"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center text-xs font-medium text-muted-foreground/40">
                {cell.dayNum}
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function DayCell({
  day,
  isToday,
  canCreateRequest,
  onCreateRequest,
  onViewRequest,
  requestRef,
}: {
  day: TimesheetDay;
  isToday: boolean;
  canCreateRequest: boolean;
  onCreateRequest: (date: string) => void;
  onViewRequest: (id: ID) => void;
  requestRef: { id: ID; status: RequestStatus } | null;
}) {
  const dayNum = Number(day.date.slice(8, 10));
  const displayStatus = deriveDisplayStatus(day);
  const hasLog = !!(day.checkInAt || day.checkOutAt);
  const duration = workedDuration(day.checkInAt, day.checkOutAt);
  const isActionable =
    canCreateRequest && ACTIONABLE_STATUSES.has(displayStatus);
  const openCreate = () => onCreateRequest(day.date);
  return (
    <div
      className={cn(
        "min-h-28 rounded-md border p-2 text-xs",
        STATUS_CLASSES[displayStatus],
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded text-xs font-semibold",
            isToday && "bg-primary text-primary-foreground",
          )}
        >
          {dayNum}
        </span>
        <div className="flex items-center gap-1">
          {displayStatus !== "WEEKEND" &&
            (() => {
              const Icon = STATUS_ICON[displayStatus];
              const badgeClasses = cn(
                "gap-1 text-[10px] font-medium",
                STATUS_BADGE_CLASSES[displayStatus],
                isActionable &&
                  "cursor-pointer transition-colors hover:brightness-95 hover:ring-1 hover:ring-current/30",
              );
              const inner = (
                <Badge variant="outline" className={badgeClasses}>
                  <Icon className="h-3 w-3" />
                  {STATUS_LABEL[displayStatus]}
                </Badge>
              );
              if (!isActionable) return inner;
              return (
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center"
                  aria-label={`Tạo đơn cho ngày ${day.date}`}
                  title="Click để tạo đơn"
                >
                  {inner}
                </button>
              );
            })()}
          {isActionable && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={openCreate}
                  aria-label={`Tạo đơn cho ngày ${day.date}`}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-current/70 transition-colors hover:bg-current/10 hover:text-current"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Tạo đơn</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      {(day.shift || hasLog) && (
        <div className="mt-2 space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground/70">
              Vào
            </span>
            <span
              className={cn(
                "tabular-nums text-[11px]",
                displayStatus === "LATE" &&
                  "font-semibold text-amber-700 dark:text-amber-400",
              )}
            >
              {formatHHMM(day.checkInAt)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground/70">
              Ra
            </span>
            <span
              className={cn(
                "tabular-nums text-[11px]",
                displayStatus === "EARLY_LEAVE" &&
                  "font-semibold text-orange-700 dark:text-orange-400",
              )}
            >
              {formatHHMM(day.checkOutAt)}
            </span>
          </div>
          {duration && (
            <div className="mt-1 border-t border-current/10 pt-1 text-right text-[10px] tabular-nums text-muted-foreground/80">
              {duration}
            </div>
          )}
        </div>
      )}
      {requestRef && (
        <button
          type="button"
          onClick={() => onViewRequest(requestRef.id)}
          className={cn(
            "mt-1.5 flex w-full items-center gap-1 border-t border-current/10 pt-1 text-left text-[10px] font-medium transition-colors hover:bg-current/5",
            REQUEST_INDICATOR_CLASSES[requestRef.status],
          )}
          aria-label={`Xem đơn ngày ${day.date}`}
        >
          <FileText className="h-3 w-3" />
          <span className="truncate">
            {REQUEST_INDICATOR_LABEL[requestRef.status]}
          </span>
        </button>
      )}
    </div>
  );
}

/**
 * Empty-state grid with the same shape as a real month — used on the
 * very first load before any data exists, so the page doesn't jump
 * from a spinner to a full-height grid.
 */
function CalendarSkeleton({ year, month }: { year: number; month: number }) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const padFront = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const total = Math.ceil((padFront + daysInMonth) / 7) * 7;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground">
        {DAY_LABELS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="min-h-28 animate-pulse rounded-md border border-border/40 bg-muted/30"
          />
        ))}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] font-normal">
      {(Object.keys(STATUS_LABEL) as DayStatus[]).map((s) => {
        const Icon = STATUS_ICON[s];
        return (
          <span
            key={s}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5",
              STATUS_BADGE_CLASSES[s],
            )}
          >
            <Icon className="h-3 w-3" />
            {STATUS_LABEL[s]}
          </span>
        );
      })}
    </div>
  );
}
