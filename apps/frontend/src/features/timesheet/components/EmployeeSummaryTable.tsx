"use client";

import { Loader2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { EmployeeSummaryRow } from "../types/report";

interface EmployeeSummaryTableProps {
  rows: EmployeeSummaryRow[];
  loading?: boolean;
  onRowClick?: (row: EmployeeSummaryRow) => void;
}

function fmtHm(minutes: number): string {
  if (!minutes) return "0";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

function AttendanceBadge({ rate }: { rate: number }) {
  const pct = rate * 100;
  const label = `${pct.toFixed(1)}%`;
  if (pct >= 95)
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
        {label}
      </span>
    );
  if (pct >= 80)
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
        {label}
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
      {label}
    </span>
  );
}

export function EmployeeSummaryTable({
  rows,
  loading,
  onRowClick,
}: EmployeeSummaryTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Không có dữ liệu cho kỳ này.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-muted/50">
          <TableRow>
            <TableHead className="min-w-20">Mã NV</TableHead>
            <TableHead className="min-w-44">Họ tên</TableHead>
            <TableHead className="min-w-28">Phòng ban</TableHead>
            <TableHead className="min-w-28 text-right">Công / Chuẩn</TableHead>
            <TableHead className="min-w-24 text-right">Giờ công</TableHead>
            <TableHead className="min-w-28 text-right">Đi muộn</TableHead>
            <TableHead className="min-w-28 text-right">Về sớm</TableHead>
            <TableHead className="min-w-16 text-right">Vắng</TableHead>
            <TableHead className="min-w-20 text-right">OT</TableHead>
            <TableHead className="min-w-24 text-right">Chuyên cần</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.employeeId}
              className={cn(onRowClick && "cursor-pointer hover:bg-muted/40")}
              onClick={() => onRowClick?.(r)}
            >
              <TableCell className="font-mono text-xs text-muted-foreground">
                {r.code}
              </TableCell>

              <TableCell>
                {r.email ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="font-medium leading-tight">
                        {r.name ?? "—"}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{r.email}</TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="font-medium leading-tight">
                    {r.name ?? "—"}
                  </span>
                )}
              </TableCell>

              <TableCell className="text-sm text-muted-foreground">
                {r.departmentName ?? "—"}
              </TableCell>

              <TableCell className="text-right tabular-nums">
                <span className="font-medium">{r.actualWorkdays}</span>
                <span className="text-muted-foreground">
                  {" / "}
                  {r.standardWorkdays}
                </span>
              </TableCell>

              <TableCell className="text-right tabular-nums">
                {fmtHm(r.totalWorkMinutes)}
              </TableCell>

              <TableCell className="text-right tabular-nums">
                {r.lateCount === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <div>
                    <div className="font-medium">{r.lateCount} lần</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtHm(r.lateMinutes)}
                    </div>
                  </div>
                )}
              </TableCell>

              <TableCell className="text-right tabular-nums">
                {r.earlyLeaveCount === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <div>
                    <div className="font-medium">{r.earlyLeaveCount} lần</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtHm(r.earlyLeaveMinutes)}
                    </div>
                  </div>
                )}
              </TableCell>

              <TableCell className="text-right tabular-nums">
                {r.absentDays === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <span
                    className={cn(
                      "font-medium",
                      r.absentDays >= 3
                        ? "text-destructive"
                        : "text-amber-600",
                    )}
                  >
                    {r.absentDays}
                  </span>
                )}
              </TableCell>

              <TableCell className="text-right tabular-nums">
                {r.otMinutesTotal === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-default font-medium">
                        {fmtHm(r.otMinutesTotal)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="space-y-0.5 text-xs">
                      <div>Thường: {fmtHm(r.otMinutesWeekday)}</div>
                      <div>Cuối tuần: {fmtHm(r.otMinutesWeekend)}</div>
                      <div>Lễ: {fmtHm(r.otMinutesHoliday)}</div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </TableCell>

              <TableCell className="text-right">
                <AttendanceBadge rate={r.attendanceRate} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
