"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { useTimesheet } from "../hooks/useTimesheet";
import type { DayStatus, TimesheetDay } from "../types";
import type { EmployeeSummaryRow } from "../types/report";

interface EmployeeReportDrawerProps {
  /** Period being viewed in the parent table — drives which month to load. */
  range: { from: string; to: string };
  row: EmployeeSummaryRow | null;
  onClose: () => void;
}

const STATUS_LABEL: Record<DayStatus, string> = {
  PRESENT: "Đủ",
  LATE: "Muộn",
  EARLY_LEAVE: "Về sớm",
  ABSENT: "Vắng",
  WEEKEND: "Nghỉ",
};

const STATUS_TONE: Record<DayStatus, string> = {
  PRESENT: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  LATE: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  EARLY_LEAVE: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  ABSENT: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
  WEEKEND: "border-border bg-muted text-muted-foreground",
};

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

export function EmployeeReportDrawer({
  range,
  row,
  onClose,
}: EmployeeReportDrawerProps) {
  // Anchor on the period's "from" — drawer always shows that calendar
  // month. If user picks a multi-month range later, we'd add a month
  // selector inside the drawer.
  const anchor = useMemo(() => new Date(`${range.from}T00:00:00`), [range.from]);
  const year = anchor.getFullYear();
  const month = anchor.getMonth() + 1;

  const { data, isLoading } = useTimesheet(row?.employeeId ?? null, year, month);

  return (
    <Sheet open={!!row} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto px-6 py-5 sm:max-w-2xl"
      >
        <SheetHeader className="px-0 pb-2">
          <SheetTitle>{row?.name ?? row?.code ?? ""}</SheetTitle>
          {row && (
            <p className="text-xs text-muted-foreground">
              {row.code}
              {row.email ? ` · ${row.email}` : ""}
              {row.departmentName ? ` · ${row.departmentName}` : ""}
            </p>
          )}
        </SheetHeader>

        {row && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div>
                <div className="text-xs text-muted-foreground">Công thực / chuẩn</div>
                <div className="font-medium tabular-nums">
                  {row.actualWorkdays} / {row.standardWorkdays}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Giờ công</div>
                <div className="font-medium tabular-nums">
                  {fmtHm(row.totalWorkMinutes)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Đi muộn</div>
                <div className="font-medium tabular-nums">
                  {row.lateCount} lần · {fmtHm(row.lateMinutes)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">OT</div>
                <div className="font-medium tabular-nums">
                  {fmtHm(row.otMinutes)}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Lịch chấm công {format(anchor, "MM/yyyy", { locale: vi })}
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !data ? (
                <p className="text-xs text-muted-foreground">Không có dữ liệu.</p>
              ) : (
                <DayList days={data.days} />
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
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
