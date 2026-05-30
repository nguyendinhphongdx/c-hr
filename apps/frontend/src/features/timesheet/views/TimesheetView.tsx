"use client";

import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock,
  Coffee,
  FilePlus2,
  Hourglass,
  Loader2,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuth, useIsAppAdmin } from "@/features/auth";
import { EmployeePicker, useEmployee } from "@/features/employees";
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

/** Per-status menu items for "Tạo đơn" actions on timesheet cells. Each
 *  item navigates to `/requests/new?groupCode=...&date=YYYY-MM-DD` —
 *  RequestCreateView reads those query params and skips the group picker.
 *  When approved, the side-effect registry upserts AttendanceLog so the
 *  cell auto-refreshes (useApproveRequest invalidates `["timesheet"]`). */
interface DayAction {
  groupCode: "checkin" | "checkout" | "leave";
  label: string;
}

const ACTIONS_BY_STATUS: Record<DayStatus, DayAction[]> = {
  PRESENT: [],
  WEEKEND: [],
  LATE: [
    { groupCode: "checkin", label: "Giải trình đi muộn / sửa giờ vào" },
    { groupCode: "leave", label: "Xin nghỉ ngày này" },
  ],
  EARLY_LEAVE: [
    { groupCode: "checkout", label: "Giải trình về sớm / sửa giờ ra" },
    { groupCode: "leave", label: "Xin nghỉ ngày này" },
  ],
  ABSENT: [
    { groupCode: "checkin", label: "Quên chấm vào" },
    { groupCode: "checkout", label: "Quên chấm ra" },
    { groupCode: "leave", label: "Xin nghỉ ngày này" },
  ],
};

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

  const stats = useMemo(() => computeStats(sheet.data?.days ?? []), [sheet.data?.days]);

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

      <StatsRow stats={stats} loading={sheet.isLoading} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>{sheet.data?.workSchedule?.name ?? "Chưa cấu hình lịch"}</span>
            <Legend />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sheet.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
            </div>
          ) : sheet.error ? (
            <p className="py-6 text-sm text-destructive">Không tải được bảng giờ làm.</p>
          ) : sheet.data ? (
            <CalendarGrid
              days={sheet.data.days}
              canCreateRequest={selectedEmployeeId === ownEmployeeId}
            />
          ) : null}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function CalendarGrid({
  days,
  canCreateRequest,
}: {
  days: TimesheetDay[];
  canCreateRequest: boolean;
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
}: {
  day: TimesheetDay;
  isToday: boolean;
  canCreateRequest: boolean;
}) {
  const router = useRouter();
  const dayNum = Number(day.date.slice(8, 10));
  const displayStatus = deriveDisplayStatus(day);
  const hasLog = !!(day.checkInAt || day.checkOutAt);
  const duration = workedDuration(day.checkInAt, day.checkOutAt);
  const actions = ACTIONS_BY_STATUS[displayStatus];
  const showActions = canCreateRequest && actions.length > 0;
  return (
    <div
      className={cn(
        "min-h-28 rounded-md border p-2 text-xs",
        STATUS_CLASSES[displayStatus],
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded text-xs font-semibold",
            isToday && "bg-primary text-primary-foreground",
          )}
        >
          {dayNum}
        </span>
        {displayStatus !== "WEEKEND" && (() => {
          const Icon = STATUS_ICON[displayStatus];
          return (
            <Badge
              variant="outline"
              className={cn(
                "gap-1 text-[10px] font-medium",
                STATUS_BADGE_CLASSES[displayStatus],
              )}
            >
              <Icon className="h-3 w-3" />
              {STATUS_LABEL[displayStatus]}
            </Badge>
          );
        })()}
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
      {showActions && (
        <div className="mt-1.5 border-t border-current/10 pt-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-1 rounded-sm px-1 py-0.5 text-[10px] font-medium text-current/80 hover:bg-current/10"
                aria-label={`Tạo đơn cho ngày ${day.date}`}
              >
                <FilePlus2 className="h-3 w-3" />
                Tạo đơn
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {actions.map((a) => (
                <DropdownMenuItem
                  key={a.groupCode}
                  onSelect={() =>
                    router.push(
                      `/requests/new?groupCode=${a.groupCode}&date=${day.date}`,
                    )
                  }
                >
                  {a.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
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
