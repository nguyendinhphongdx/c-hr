"use client";

import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useDeleteHoliday } from "../hooks/useHolidays";
import type { Holiday } from "../types";

interface HolidayTableProps {
  rows: Holiday[];
  loading?: boolean;
  year: number;
  onEdit: (h: Holiday) => void;
}

function fmtDate(iso: string): string {
  // BE returns date-only as ISO. Strip time then parse locally so the
  // displayed day matches the stored calendar day regardless of tz.
  const dateOnly = iso.slice(0, 10);
  return format(parseISO(dateOnly), "dd/MM/yyyy (EEE)", { locale: vi });
}

export function HolidayTable({ rows, loading, year, onEdit }: HolidayTableProps) {
  const remove = useDeleteHoliday();

  const onDelete = async (h: Holiday) => {
    if (!confirm(`Xoá ngày lễ "${h.name}" (${h.date.slice(0, 10)})?`)) return;
    try {
      await remove.mutateAsync(h.id);
      toast.success("Đã xoá");
    } catch (err) {
      toast.error("Không xoá được", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">
          Chưa có ngày lễ năm {year}.
        </p>
        <p className="mt-1">
          Thêm các ngày lễ chính thức (Tết Dương lịch, Tết âm lịch, Quốc
          khánh…) + ngày nghỉ nội bộ để hệ thống tính OT đúng hệ số.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="min-w-44">Ngày</TableHead>
            <TableHead>Tên</TableHead>
            <TableHead className="w-32">Có lương</TableHead>
            <TableHead className="w-28 text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((h) => (
            <TableRow
              key={h.id}
              className="cursor-pointer hover:bg-muted/40"
              onClick={() => onEdit(h)}
            >
              <TableCell className="tabular-nums">{fmtDate(h.date)}</TableCell>
              <TableCell className="font-medium">{h.name}</TableCell>
              <TableCell>
                {h.isPaid ? (
                  <Badge variant="secondary">Có lương</Badge>
                ) : (
                  <Badge variant="outline">Không lương</Badge>
                )}
              </TableCell>
              <TableCell
                className="flex justify-end gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(h)}
                  aria-label="Sửa"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(h)}
                  disabled={remove.isPending}
                  aria-label="Xoá"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
