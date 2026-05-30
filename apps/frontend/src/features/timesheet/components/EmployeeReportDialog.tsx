"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Award,
  CalendarOff,
  ChevronDown,
  Clock,
  Hourglass,
  Loader2,
  LogIn,
  LogOut,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { useTimesheet } from "../hooks/useTimesheet";
import type { DayStatus, TimesheetDay } from "../types";
import type { EmployeeSummaryRow } from "../types/report";

interface EmployeeReportDialogProps {
  /** Period being viewed in the parent table — drives which month to load. */
  range: { from: string; to: string };
  row: EmployeeSummaryRow | null;
  onClose: () => void;
}

const STATUS_COLOR: Record<DayStatus, string> = {
  PRESENT: "#10b981", // emerald-500
  LATE: "#f59e0b", // amber-500
  EARLY_LEAVE: "#f97316", // orange-500
  ABSENT: "#ef4444", // red-500
  WEEKEND: "#e5e7eb", // gray-200
};

const STATUS_LABEL: Record<DayStatus, string> = {
  PRESENT: "Đủ",
  LATE: "Muộn",
  EARLY_LEAVE: "Về sớm",
  ABSENT: "Vắng",
  WEEKEND: "Nghỉ",
};

const STATUS_TONE: Record<DayStatus, string> = {
  PRESENT:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  LATE:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  EARLY_LEAVE:
    "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300",
  ABSENT:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
  WEEKEND: "border-border bg-muted text-muted-foreground",
};

const WEEKDAY_LABEL = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "HH:mm");
}

function fmtHm(minutes: number): string {
  if (!minutes) return "0";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

function fmtClock(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Parse "HH:MM" → fractional hours (8.5 = 08:30). */
function parseHourFraction(time: string | undefined): number | null {
  if (!time) return null;
  const m = /^(\d{2}):(\d{2})/.exec(time);
  if (!m) return null;
  return Number(m[1]) + Number(m[2]) / 60;
}

/** Date instant → fractional hours of the day in browser local. Matches
 *  what `fmtTime` (HH:MM) displays so chart Y matches table cells. */
function instantHourFraction(iso: string): number {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}

interface Insights {
  avgCheckInMinutes: number | null;
  avgCheckOutMinutes: number | null;
  avgWorkMinutes: number | null;
  onTimeStreak: number;
  lateByWeekday: number[];
  worstWeekday: number | null;
  missingCheckIn: number;
  missingCheckOut: number;
}

function computeInsights(days: TimesheetDay[]): Insights {
  const checkInMinutes: number[] = [];
  const checkOutMinutes: number[] = [];
  const workMinutes: number[] = [];
  const lateByWeekday = [0, 0, 0, 0, 0, 0, 0];
  let missingCheckIn = 0;
  let missingCheckOut = 0;
  let curStreak = 0;
  let maxStreak = 0;

  for (const d of days) {
    const hasShift = !!d.shift;
    const isWeekend = d.status === "WEEKEND";

    if (d.checkInAt) {
      const t = new Date(d.checkInAt);
      checkInMinutes.push(t.getHours() * 60 + t.getMinutes());
    } else if (hasShift && !isWeekend) {
      missingCheckIn += 1;
    }
    if (d.checkOutAt) {
      const t = new Date(d.checkOutAt);
      checkOutMinutes.push(t.getHours() * 60 + t.getMinutes());
    } else if (d.checkInAt) {
      missingCheckOut += 1;
    }
    if (d.checkInAt && d.checkOutAt) {
      workMinutes.push(
        Math.max(
          0,
          (new Date(d.checkOutAt).getTime() -
            new Date(d.checkInAt).getTime()) /
            60_000,
        ),
      );
    }
    if (d.status === "LATE") {
      const dt = new Date(`${d.date}T00:00:00Z`);
      const dow = dt.getUTCDay();
      const idx = dow === 0 ? 6 : dow - 1;
      lateByWeekday[idx] += 1;
    }
    if (hasShift) {
      if (d.status === "PRESENT") {
        curStreak += 1;
        if (curStreak > maxStreak) maxStreak = curStreak;
      } else if (
        d.status === "LATE" ||
        d.status === "EARLY_LEAVE" ||
        d.status === "ABSENT"
      ) {
        curStreak = 0;
      }
      // WEEKEND inside the workdays loop is unusual — leave streak unchanged.
    }
  }

  const avg = (arr: number[]): number | null =>
    arr.length === 0 ? null : Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

  const worstWeekday = lateByWeekday.some((v) => v > 0)
    ? lateByWeekday.indexOf(Math.max(...lateByWeekday))
    : null;

  return {
    avgCheckInMinutes: avg(checkInMinutes),
    avgCheckOutMinutes: avg(checkOutMinutes),
    avgWorkMinutes: avg(workMinutes),
    onTimeStreak: maxStreak,
    lateByWeekday,
    worstWeekday,
    missingCheckIn,
    missingCheckOut,
  };
}

interface StatusBreakdownPoint {
  status: DayStatus;
  name: string;
  value: number;
  fill: string;
}

function computeStatusBreakdown(days: TimesheetDay[]): StatusBreakdownPoint[] {
  const counts: Record<DayStatus, number> = {
    PRESENT: 0,
    LATE: 0,
    EARLY_LEAVE: 0,
    ABSENT: 0,
    WEEKEND: 0,
  };
  for (const d of days) counts[d.status] += 1;
  return (Object.keys(counts) as DayStatus[])
    .filter((s) => counts[s] > 0)
    .map((s) => ({
      status: s,
      name: STATUS_LABEL[s],
      value: counts[s],
      fill: STATUS_COLOR[s],
    }));
}

interface DailyHoursPoint {
  day: number;
  hours: number;
  fill: string;
  status: DayStatus;
  date: string;
}

function buildDailyHoursData(days: TimesheetDay[]): DailyHoursPoint[] {
  return days.map((d) => {
    const minutes =
      d.checkInAt && d.checkOutAt
        ? Math.max(
            0,
            (new Date(d.checkOutAt).getTime() -
              new Date(d.checkInAt).getTime()) /
              60_000,
          )
        : 0;
    return {
      day: Number(d.date.slice(8, 10)),
      hours: Number((minutes / 60).toFixed(2)),
      fill: STATUS_COLOR[d.status],
      status: d.status,
      date: d.date,
    };
  });
}

interface CheckInScatterPoint {
  day: number;
  time: number;
  status: DayStatus;
  fill: string;
  date: string;
}

function buildCheckInScatterData(days: TimesheetDay[]): CheckInScatterPoint[] {
  const out: CheckInScatterPoint[] = [];
  for (const d of days) {
    if (!d.checkInAt) continue;
    out.push({
      day: Number(d.date.slice(8, 10)),
      time: instantHourFraction(d.checkInAt),
      status: d.status,
      fill: STATUS_COLOR[d.status],
      date: d.date,
    });
  }
  return out;
}

/** Find the dominant scheduled shift start hour for the month (the
 *  start used by the most workdays). Powers the punctuality reference
 *  line on the scatter chart. Returns null if no shift configured. */
function dominantShiftStart(days: TimesheetDay[]): number | null {
  const tally = new Map<string, number>();
  for (const d of days) {
    if (!d.shift) continue;
    tally.set(d.shift.startTime, (tally.get(d.shift.startTime) ?? 0) + 1);
  }
  if (tally.size === 0) return null;
  let best: { time: string; count: number } | null = null;
  for (const [time, count] of tally) {
    if (!best || count > best.count) best = { time, count };
  }
  return best ? parseHourFraction(best.time) : null;
}

export function EmployeeReportDialog({
  range,
  row,
  onClose,
}: EmployeeReportDialogProps) {
  // Anchor on the period's "from" — dialog always shows that calendar
  // month. If the parent picks a multi-month range later, we'd add a
  // month selector inside the dialog (one chart group per month).
  const anchor = useMemo(
    () => new Date(`${range.from}T00:00:00`),
    [range.from],
  );
  const year = anchor.getFullYear();
  const month = anchor.getMonth() + 1;

  const { data, isLoading } = useTimesheet(row?.employeeId ?? null, year, month);
  const days = data?.days ?? [];

  const insights = useMemo(() => computeInsights(days), [days]);
  const breakdown = useMemo(() => computeStatusBreakdown(days), [days]);
  const dailyHours = useMemo(() => buildDailyHoursData(days), [days]);
  const checkInPoints = useMemo(
    () => buildCheckInScatterData(days),
    [days],
  );
  const shiftStartHour = useMemo(() => dominantShiftStart(days), [days]);
  const graceHour = shiftStartHour !== null ? shiftStartHour + 0.25 : null;

  const [showDayList, setShowDayList] = useState(false);

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-6 pt-6 pb-4">
          <DialogTitle>{row?.name ?? row?.code ?? ""}</DialogTitle>
          {row && (
            <p className="text-xs text-muted-foreground">
              {row.code}
              {row.email ? ` · ${row.email}` : ""}
              {row.departmentName ? ` · ${row.departmentName}` : ""}
              {" · "}
              {format(anchor, "MM/yyyy", { locale: vi })}
            </p>
          )}
        </DialogHeader>

        {row && (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <KpiStrip row={row} />

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : days.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Không có dữ liệu cho kỳ này.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1.4fr]">
                  <StatusBreakdownCard data={breakdown} />
                  <InsightsCard insights={insights} />
                </div>

                <DailyHoursCard data={dailyHours} />

                {(checkInPoints.length > 0 || shiftStartHour !== null) && (
                  <CheckInScatterCard
                    data={checkInPoints}
                    shiftStart={shiftStartHour}
                    grace={graceHour}
                  />
                )}

                <MonthStrip days={days} />

                <details
                  open={showDayList}
                  onToggle={(e) =>
                    setShowDayList((e.target as HTMLDetailsElement).open)
                  }
                  className="rounded-md border border-border"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-2 text-sm font-medium hover:bg-muted/40">
                    <span>Chi tiết theo ngày</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        showDayList && "rotate-180",
                      )}
                    />
                  </summary>
                  <div className="px-4 pb-3 pt-1">
                    <DayList days={days} />
                  </div>
                </details>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function KpiStrip({ row }: { row: EmployeeSummaryRow }) {
  const tiles = [
    {
      icon: Award,
      label: "Công thực / chuẩn",
      value: `${row.actualWorkdays} / ${row.standardWorkdays}`,
      hint: `${(row.attendanceRate * 100).toFixed(1)}% chuyên cần`,
    },
    {
      icon: Hourglass,
      label: "Giờ công",
      value: fmtHm(row.totalWorkMinutes),
    },
    {
      icon: Clock,
      label: "Đi muộn",
      value: `${row.lateCount} lần`,
      hint: row.lateMinutes ? `Tổng ${fmtHm(row.lateMinutes)}` : undefined,
    },
    {
      icon: CalendarOff,
      label: "Vắng",
      value: String(row.absentDays),
    },
    {
      icon: TrendingUp,
      label: "OT tổng",
      value: fmtHm(row.otMinutesTotal),
      hint:
        row.otMinutesTotal > 0
          ? `T ${fmtHm(row.otMinutesWeekday)} · CT ${fmtHm(row.otMinutesWeekend)} · L ${fmtHm(row.otMinutesHoliday)}`
          : undefined,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="flex items-start gap-2 rounded-md border border-border bg-card p-2.5"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <t.icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t.label}
            </div>
            <div className="text-base font-semibold tabular-nums">
              {t.value}
            </div>
            {t.hint && (
              <div className="truncate text-[10px] text-muted-foreground">
                {t.hint}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBreakdownCard({ data }: { data: StatusBreakdownPoint[] }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Phân loại ngày
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-2">
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={42}
                outerRadius={68}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((p) => (
                  <Cell key={p.status} fill={p.fill} />
                ))}
              </Pie>
              <RechartsTooltip
                contentStyle={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(value, name) => {
                  const n = Number(value);
                  return [
                    `${n} ngày (${((n / total) * 100).toFixed(0)}%)`,
                    String(name ?? ""),
                  ];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-1.5 text-xs">
          {data.map((p) => (
            <li key={p.status} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: p.fill }}
              />
              <span className="font-medium">{p.name}</span>
              <span className="tabular-nums text-muted-foreground">
                {p.value} ({((p.value / total) * 100).toFixed(0)}%)
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function InsightsCard({ insights }: { insights: Insights }) {
  const rows: { icon: typeof LogIn; label: string; value: string }[] = [
    {
      icon: LogIn,
      label: "Giờ vào trung bình",
      value:
        insights.avgCheckInMinutes !== null
          ? fmtClock(insights.avgCheckInMinutes)
          : "—",
    },
    {
      icon: LogOut,
      label: "Giờ ra trung bình",
      value:
        insights.avgCheckOutMinutes !== null
          ? fmtClock(insights.avgCheckOutMinutes)
          : "—",
    },
    {
      icon: Hourglass,
      label: "Giờ làm TB / ngày",
      value:
        insights.avgWorkMinutes !== null
          ? fmtHm(insights.avgWorkMinutes)
          : "—",
    },
    {
      icon: Award,
      label: "Chuỗi đúng giờ dài nhất",
      value: `${insights.onTimeStreak} ngày`,
    },
    {
      icon: Clock,
      label: "Trễ nhiều nhất",
      value:
        insights.worstWeekday !== null
          ? `${WEEKDAY_LABEL[insights.worstWeekday]} (${insights.lateByWeekday[insights.worstWeekday]} lần)`
          : "—",
    },
    {
      icon: CalendarOff,
      label: "Ngày thiếu chấm",
      value:
        insights.missingCheckIn + insights.missingCheckOut === 0
          ? "0"
          : `${insights.missingCheckIn} vào · ${insights.missingCheckOut} ra`,
    },
  ];
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Phân tích nhanh
      </div>
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center gap-2 rounded-sm px-1.5 py-1 text-sm hover:bg-muted/40"
          >
            <r.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {r.label}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">
              {r.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DailyHoursCard({ data }: { data: DailyHoursPoint[] }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Giờ làm theo ngày
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {(["PRESENT", "LATE", "EARLY_LEAVE", "ABSENT"] as DayStatus[]).map(
            (s) => (
              <span key={s} className="inline-flex items-center gap-1">
                <span
                  className="inline-block h-2 w-2 rounded-sm"
                  style={{ background: STATUS_COLOR[s] }}
                />
                {STATUS_LABEL[s]}
              </span>
            ),
          )}
        </div>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
            barCategoryGap={2}
          >
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}h`}
              width={36}
            />
            <RechartsTooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              contentStyle={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 12,
              }}
              formatter={(value, _name, ctx) => {
                const payload = ctx?.payload as DailyHoursPoint | undefined;
                return [
                  `${Number(value)}h · ${payload ? STATUS_LABEL[payload.status] : ""}`,
                  "Giờ làm",
                ];
              }}
              labelFormatter={(label) => `Ngày ${label}`}
            />
            <Bar dataKey="hours" radius={[3, 3, 0, 0]}>
              {data.map((p) => (
                <Cell key={p.date} fill={p.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CheckInScatterCard({
  data,
  shiftStart,
  grace,
}: {
  data: CheckInScatterPoint[];
  shiftStart: number | null;
  grace: number | null;
}) {
  const allTimes = data.map((p) => p.time);
  const minTime = Math.min(
    ...(shiftStart !== null ? [...allTimes, shiftStart - 0.5] : allTimes),
    7,
  );
  const maxTime = Math.max(
    ...(grace !== null ? [...allTimes, grace + 0.5] : allTimes),
    9,
  );
  const yMin = Math.floor(minTime);
  const yMax = Math.ceil(maxTime + 0.1);
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Giờ vào theo ngày
        </div>
        <div className="text-[10px] text-muted-foreground">
          {shiftStart !== null
            ? `Ca chuẩn ${fmtClock(Math.round(shiftStart * 60))}${grace !== null ? ` · grace tới ${fmtClock(Math.round(grace * 60))}` : ""}`
            : "Chưa có ca chuẩn"}
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
          >
            <XAxis
              type="number"
              dataKey="day"
              domain={[1, 31]}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="number"
              dataKey="time"
              domain={[yMin, yMax]}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => fmtClock(Math.round(v * 60))}
              width={36}
              reversed
            />
            {shiftStart !== null && (
              <ReferenceLine
                y={shiftStart}
                stroke="#10b981"
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              />
            )}
            {grace !== null && (
              <ReferenceLine
                y={grace}
                stroke="#f59e0b"
                strokeDasharray="2 4"
                ifOverflow="extendDomain"
              />
            )}
            <RechartsTooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 12,
              }}
              formatter={(value, name, ctx) => {
                const payload = ctx?.payload as CheckInScatterPoint | undefined;
                const n = Number(value);
                if (name === "time") {
                  return [
                    `${fmtClock(Math.round(n * 60))} · ${payload ? STATUS_LABEL[payload.status] : ""}`,
                    "Giờ vào",
                  ];
                }
                return [String(value ?? ""), String(name ?? "")];
              }}
              labelFormatter={(label) => `Ngày ${label}`}
            />
            <Scatter data={data}>
              {data.map((p) => (
                <Cell key={p.date} fill={p.fill} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MonthStrip({ days }: { days: TimesheetDay[] }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Bản đồ tháng
      </div>
      <div className="flex flex-wrap gap-1">
        {days.map((d) => (
          <div
            key={d.date}
            title={`${d.date.slice(8, 10)}/${d.date.slice(5, 7)} · ${STATUS_LABEL[d.status]}${d.checkInAt ? ` · vào ${fmtTime(d.checkInAt)}` : ""}${d.checkOutAt ? ` · ra ${fmtTime(d.checkOutAt)}` : ""}`}
            className="flex h-7 w-7 items-center justify-center rounded text-[10px] font-medium tabular-nums text-white shadow-sm"
            style={{
              background: STATUS_COLOR[d.status],
              color: d.status === "WEEKEND" ? "#6b7280" : "white",
            }}
          >
            {d.date.slice(8, 10)}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayList({ days }: { days: TimesheetDay[] }) {
  return (
    <ul className="space-y-1">
      {days.map((d) => (
        <li
          key={d.date}
          className={cn(
            "flex items-center gap-3 rounded-md border px-3 py-1.5 text-sm",
            d.status === "WEEKEND" && "bg-muted/30",
          )}
        >
          <div className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground">
            {d.date.slice(8, 10)}/{d.date.slice(5, 7)}
          </div>
          <Badge
            variant="outline"
            className={cn(
              "h-5 shrink-0 px-1.5 text-[10px]",
              STATUS_TONE[d.status],
            )}
          >
            {STATUS_LABEL[d.status]}
          </Badge>
          <div className="min-w-0 flex-1 text-xs text-muted-foreground tabular-nums">
            {d.shift ? (
              <span>
                Ca {d.shift.startTime}–{d.shift.endTime}
              </span>
            ) : (
              <span className="italic">Không có ca</span>
            )}
          </div>
          <div className="shrink-0 text-xs tabular-nums">
            {fmtTime(d.checkInAt)} → {fmtTime(d.checkOutAt)}
          </div>
        </li>
      ))}
    </ul>
  );
}
