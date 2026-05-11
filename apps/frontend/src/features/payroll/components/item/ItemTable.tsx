"use client";

import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { PayrollItemRow } from "../../types";

import { formatVndCurrency } from "./VndInput";

interface ItemTableProps {
  items: PayrollItemRow[];
  onEdit: (id: string) => void;
  canEdit: boolean;
}

function workdaysDisplay(item: PayrollItemRow): string {
  const actual = Number(item.actualWorkdays);
  const std = item.standardWorkdays;
  const actualStr = Number.isInteger(actual) ? actual.toFixed(0) : actual.toFixed(1);
  return `${actualStr} / ${std}`;
}

function totalOtMinutes(item: PayrollItemRow): number {
  return (
    (item.otMinutesWeekday ?? 0) +
    (item.otMinutesWeekend ?? 0) +
    (item.otMinutesHoliday ?? 0)
  );
}

function formatOt(minutes: number): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h${m}p`;
  if (h) return `${h}h`;
  return `${m}p`;
}

function sumString(items: PayrollItemRow[], key: keyof PayrollItemRow): number {
  return items.reduce((acc, it) => {
    const v = it[key];
    const n = typeof v === "string" ? Number(v) : 0;
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

export function ItemTable({ items, onEdit, canEdit }: ItemTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
        <p className="text-sm font-medium">Chưa có item nào trong kỳ lương</p>
        <p className="text-xs text-muted-foreground">
          Mọi nhân viên đang làm việc có lương cơ bản đều được tự seed khi tạo
          kỳ. Có thể không khớp filter hiện tại.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px]">Mã NV</TableHead>
            <TableHead>Họ tên</TableHead>
            <TableHead>Phòng ban</TableHead>
            <TableHead className="text-right">Lương CB</TableHead>
            <TableHead className="text-center">Công thực/chuẩn</TableHead>
            <TableHead className="text-center">OT</TableHead>
            <TableHead className="text-right">Gross</TableHead>
            <TableHead className="text-right">Bảo hiểm</TableHead>
            <TableHead className="text-right">Thuế TNCN</TableHead>
            <TableHead className="text-right">Net</TableHead>
            <TableHead className="w-[64px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((it) => {
            const displayName = it.employee.user?.name ?? it.employee.user?.email ?? "—";
            return (
              <TableRow
                key={it.id}
                className="cursor-pointer hover:bg-accent/30"
                onClick={() => onEdit(it.id)}
              >
                <TableCell className="font-mono text-xs">
                  {it.employee.code}
                </TableCell>
                <TableCell className="text-sm">{displayName}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {it.employee.department?.name ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatVndCurrency(it.baseSalary)}
                </TableCell>
                <TableCell className="text-center text-sm tabular-nums">
                  {workdaysDisplay(it)}
                </TableCell>
                <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                  {formatOt(totalOtMinutes(it))}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatVndCurrency(it.grossIncome)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatVndCurrency(it.insuranceTotal)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatVndCurrency(it.taxAmount)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatVndCurrency(it.netPay)}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(it.id);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="sr-only">
                      {canEdit ? "Sửa" : "Xem"}
                    </span>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow className="bg-muted/40 font-semibold">
            <TableCell colSpan={3} className="text-sm">
              Tổng cộng
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatVndCurrency(sumString(items, "baseSalary"))}
            </TableCell>
            <TableCell />
            <TableCell />
            <TableCell className="text-right tabular-nums">
              {formatVndCurrency(sumString(items, "grossIncome"))}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatVndCurrency(sumString(items, "insuranceTotal"))}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatVndCurrency(sumString(items, "taxAmount"))}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatVndCurrency(sumString(items, "netPay"))}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
