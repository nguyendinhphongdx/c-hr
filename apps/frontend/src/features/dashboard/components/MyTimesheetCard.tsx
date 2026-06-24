"use client";

import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  CircleX,
  Clock,
  Coffee,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth";
import {
  useTimesheet,
  type DayStatus,
  type TimesheetDay,
} from "@/features/timesheet";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const STATUS_CLASSES: Record<DayStatus, string> = {
  PRESENT:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  LATE:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300",
  EARLY_LEAVE:
    "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/60 dark:bg-orange-950/40 dark:text-orange-300",
  ABSENT:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300",
  WEEKEND: "border-border bg-muted/40 text-muted-foreground",
};

const STATUS_ICON: Record<DayStatus, LucideIcon> = {
  PRESENT: CircleCheck,
  LATE: Clock,
  EARLY_LEAVE: LogOut,
  ABSENT: CircleX,
  WEEKEND: Coffee,
};

function deriveDisplayStatus(day: TimesheetDay): DayStatus {
  if (day.status !== "WEEKEND") return day.status;
  return day.checkInAt || day.checkOutAt ? "PRESENT" : "WEEKEND";
}

function getMondayOffset(year: number, month: number): number {
  const day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export function MyTimesheetCard() {
  const { user } = useAuth();
  const employeeId = user?.employeeId ?? null;
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const sheet = useTimesheet(employeeId, year, month);

  const stats = useMemo(() => {
    const result = { present: 0, late: 0, earlyLeave: 0, absent: 0 };
    for (const day of sheet.data?.days ?? []) {
      switch (deriveDisplayStatus(day)) {
        case "PRESENT":
          result.present += 1;
          break;
        case "LATE":
          result.late += 1;
          break;
        case "EARLY_LEAVE":
          result.earlyLeave += 1;
          break;
        case "ABSENT":
          result.absent += 1;
          break;
      }
    }
    return result;
  }, [sheet.data]);

  const offset = getMondayOffset(year, month);
  const todayKey = `${year}-${String(month).padStart(2, "0")}-${String(
    today.getDate(),
  ).padStart(2, "0")}`;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Bảng chấm công của tôi
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Tháng {month}/{year}
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href="/attendance/timesheet">
            Xem chi tiết <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent>
        {!employeeId ? (
          <p className="text-sm text-muted-foreground">
            Tài khoản chưa liên kết hồ sơ nhân sự.
          </p>
        ) : sheet.isLoading || !sheet.data ? (
          <div className="h-40 animate-pulse rounded-md bg-muted/40" />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-medium text-muted-foreground">
                {DAY_LABELS.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: offset }, (_, index) => (
                  <div key={`empty-${index}`} />
                ))}
                {sheet.data.days.map((day) => {
                  const status = deriveDisplayStatus(day);
                  const StatusIcon = STATUS_ICON[status];
                  const isToday = day.date === todayKey;

                  return (
                    <div
                      key={day.date}
                      title={day.date}
                      className={cn(
                        "flex min-h-10 items-center justify-between rounded-md border px-2 text-xs",
                        STATUS_CLASSES[status],
                        isToday && "ring-2 ring-primary ring-offset-1",
                      )}
                    >
                      <span className="font-medium tabular-nums">
                        {Number(day.date.slice(8, 10))}
                      </span>
                      <StatusIcon className="h-3 w-3 opacity-70" />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 self-start">
              <Stat label="Đúng giờ" value={stats.present} tone="emerald" />
              <Stat label="Đi trễ" value={stats.late} tone="amber" />
              <Stat label="Về sớm" value={stats.earlyLeave} tone="orange" />
              <Stat label="Vắng" value={stats.absent} tone="rose" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "orange" | "rose";
}) {
  const toneClass = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    orange: "text-orange-600 dark:text-orange-400",
    rose: "text-rose-600 dark:text-rose-400",
  }[tone];

  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className={cn("text-2xl font-semibold tabular-nums", toneClass)}>
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
