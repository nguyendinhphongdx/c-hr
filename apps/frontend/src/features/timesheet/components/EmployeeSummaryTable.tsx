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

function fmtPct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * Per-employee timesheet summary table. Columns picked to feed the
 * payroll workflow: HR copies these to compute monthly pay.
 *
 * Late / Early-leave / OT show as "lần · phút" on one line so the row
 * stays narrow on a 13" laptop.
 */
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
            <TableHead className="min-w-24">Mã NV</TableHead>
            <TableHead className="min-w-40">Họ tên</TableHead>
            <TableHead className="min-w-32">Phòng ban</TableHead>
            <TableHead className="text-right">Công thực / chuẩn</TableHead>
            <TableHead className="text-right">Giờ công</TableHead>
            <TableHead className="text-right">Đi muộn</TableHead>
            <TableHead className="text-right">Về sớm</TableHead>
            <TableHead className="text-right">Vắng</TableHead>
            <TableHead className="text-right">OT</TableHead>
            <TableHead className="text-right">Chuyên cần</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.employeeId}
              className={cn(
                onRowClick && "cursor-pointer hover:bg-muted/40",
              )}
              onClick={() => onRowClick?.(r)}
            >
              <TableCell className="font-mono text-xs">{r.code}</TableCell>
              <TableCell>
                <div className="leading-tight">
                  <div className="font-medium">{r.name ?? "—"}</div>
                  {r.email && (
                    <div className="text-[10px] text-muted-foreground">
                      {r.email}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {r.departmentName ?? "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <span className="font-medium">{r.actualWorkdays}</span>
                <span className="text-muted-foreground"> / {r.standardWorkdays}</span>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtHm(r.totalWorkMinutes)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {r.lateCount === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <span>
                    <span className="font-medium">{r.lateCount}</span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {fmtHm(r.lateMinutes)}
                    </span>
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {r.earlyLeaveCount === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <span>
                    <span className="font-medium">{r.earlyLeaveCount}</span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {fmtHm(r.earlyLeaveMinutes)}
                    </span>
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {r.absentDays === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <span className="font-medium text-destructive">
                    {r.absentDays}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {r.otMinutes === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  fmtHm(r.otMinutes)
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                {fmtPct(r.attendanceRate)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
