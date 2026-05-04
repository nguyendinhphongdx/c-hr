"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth";
import { useEmployee } from "@/features/employees";
import { cn } from "@/lib/utils";

import { useTimesheet } from "../hooks/useTimesheet";
import type { DayStatus, TimesheetDay } from "../types";

const STATUS_CLASSES: Record<DayStatus, string> = {
  PRESENT: "bg-emerald-50 border-emerald-200",
  LATE: "bg-amber-50 border-amber-200",
  EARLY_LEAVE: "bg-orange-50 border-orange-200",
  ABSENT: "bg-rose-50 border-rose-200",
  WEEKEND: "bg-muted/40 border-border",
};

const STATUS_LABEL: Record<DayStatus, string> = {
  PRESENT: "On time",
  LATE: "Late",
  EARLY_LEAVE: "Early",
  ABSENT: "Absent",
  WEEKEND: "Off",
};

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function formatHHMM(value: string | null): string {
  if (!value) return "--:--";
  const d = new Date(value);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TimesheetView() {
  const { user } = useAuth();
  const employee = useEmployee(user?.employeeId ?? null);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const employeeId = user?.employeeId ?? null;
  const sheet = useTimesheet(employeeId, year, month);

  const goPrev = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };
  const goNext = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  if (!employeeId) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-sm text-muted-foreground">
        Tài khoản chưa được link với hồ sơ Employee — liên hệ HRM admin.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Timesheet</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lịch chấm công của{" "}
            <span className="font-medium text-foreground">
              {employee.data?.user?.name ?? "…"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goPrev} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium">
            Tháng {month}/{year}
          </span>
          <Button variant="outline" size="icon" onClick={goNext} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

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
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : sheet.error ? (
            <p className="py-6 text-sm text-destructive">Couldn&apos;t load timesheet.</p>
          ) : sheet.data ? (
            <CalendarGrid days={sheet.data.days} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function CalendarGrid({ days }: { days: TimesheetDay[] }) {
  if (days.length === 0) return null;
  const today = todayKey();

  // Pad the front so day 1 lands on the right ISO weekday column.
  const first = new Date(days[0].date + "T00:00:00Z");
  const isoFirst = first.getUTCDay() === 0 ? 7 : first.getUTCDay();
  const padFront = isoFirst - 1;

  const cells: (TimesheetDay | null)[] = [
    ...Array(padFront).fill(null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground">
        {DAY_LABELS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((cell, i) =>
          cell ? (
            <DayCell key={cell.date} day={cell} isToday={cell.date === today} />
          ) : (
            <div key={`pad_${i}`} className="rounded-md border border-transparent" />
          ),
        )}
      </div>
    </div>
  );
}

function DayCell({ day, isToday }: { day: TimesheetDay; isToday: boolean }) {
  const dayNum = Number(day.date.slice(8, 10));
  return (
    <div
      className={cn(
        "min-h-24 rounded-md border p-2 text-xs",
        STATUS_CLASSES[day.status],
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
        {day.status !== "WEEKEND" && (
          <Badge variant="outline" className="text-[10px] font-normal">
            {STATUS_LABEL[day.status]}
          </Badge>
        )}
      </div>
      {day.shift && (
        <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <span aria-hidden>→|</span>
            <span className={cn(day.status === "LATE" && "text-amber-700 font-medium")}>
              {formatHHMM(day.checkInAt)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span aria-hidden>|→</span>
            <span
              className={cn(
                day.status === "EARLY_LEAVE" && "text-orange-700 font-medium",
              )}
            >
              {formatHHMM(day.checkOutAt)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] font-normal text-muted-foreground">
      {(Object.keys(STATUS_LABEL) as DayStatus[]).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span
            className={cn("h-2.5 w-2.5 rounded-sm border", STATUS_CLASSES[s])}
          />
          {STATUS_LABEL[s]}
        </span>
      ))}
    </div>
  );
}
