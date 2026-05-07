"use client";

import { Calendar, Clock, LogIn, LogOut } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth";
import { useTimesheet } from "@/features/timesheet";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<string, string> = {
  PRESENT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  LATE: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  EARLY_LEAVE: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  ABSENT: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  WEEKEND: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  PRESENT: "Đúng giờ",
  LATE: "Trễ",
  EARLY_LEAVE: "Về sớm",
  ABSENT: "Vắng",
  WEEKEND: "Off",
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatHHMM(value: string | null): string {
  if (!value) return "--:--";
  const d = new Date(value);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function TodayStatusCard() {
  const { user } = useAuth();
  const employeeId = user?.employeeId ?? null;
  const today = new Date();
  const sheet = useTimesheet(employeeId, today.getFullYear(), today.getMonth() + 1);

  if (!employeeId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-muted-foreground" /> Hôm nay
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Tài khoản chưa liên kết hồ sơ Employee — chưa có dữ liệu chấm công.
        </CardContent>
      </Card>
    );
  }

  if (sheet.isLoading || !sheet.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-muted-foreground" /> Hôm nay
          </CardTitle>
        </CardHeader>
        <CardContent className="h-20 animate-pulse rounded bg-muted/40" />
      </Card>
    );
  }

  const day = sheet.data.days.find((d) => d.date === todayKey());
  const hasShift = !!day?.shift;
  const checkedIn = !!day?.checkInAt;
  const checkedOut = !!day?.checkOutAt;
  const status = day?.status ?? "WEEKEND";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" /> Hôm nay
          </span>
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[11px] font-medium",
              STATUS_BADGE[status],
            )}
          >
            {STATUS_LABEL[status]}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {hasShift && day?.shift ? (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Ca: {day.shift.name}</span>
            <span className="tabular-nums">
              {day.shift.startTime} – {day.shift.endTime}
            </span>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Hôm nay không có ca làm.</div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <LogIn className="h-3 w-3" /> Vào
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {formatHHMM(day?.checkInAt ?? null)}
            </div>
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <LogOut className="h-3 w-3" /> Ra
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {formatHHMM(day?.checkOutAt ?? null)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/timesheet">
              <Clock className="h-3.5 w-3.5" /> Bảng chấm công
            </Link>
          </Button>
          {!checkedIn && hasShift && (
            <Button asChild variant="outline" size="sm">
              <Link href="/requests/new">Đơn quên chấm vào</Link>
            </Button>
          )}
          {checkedIn && !checkedOut && hasShift && (
            <Button asChild variant="outline" size="sm">
              <Link href="/requests/new">Đơn quên chấm ra</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
