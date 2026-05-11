"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { DeductionRow } from "../../types";

import { VndInput } from "./VndInput";

interface DeductionRowsEditorProps {
  value: DeductionRow[];
  onChange: (next: DeductionRow[]) => void;
  disabled?: boolean;
}

const EMPTY: DeductionRow = { name: "", amount: 0, note: "" };

export function DeductionRowsEditor({
  value,
  onChange,
  disabled,
}: DeductionRowsEditorProps) {
  const update = (idx: number, patch: Partial<DeductionRow>) => {
    onChange(value.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };
  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };
  const add = () => {
    onChange([...value, { ...EMPTY }]);
  };

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Chưa có khấu trừ. Bấm <em>+ Thêm khấu trừ</em> để bổ sung (tạm ứng,
          phạt đi muộn, công đoàn…).
        </p>
      )}

      {value.length > 0 && (
        <div className="rounded-md border">
          <div className="grid grid-cols-[1fr_160px_1fr_44px] items-center gap-2 border-b bg-muted/30 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <span>Tên khoản</span>
            <span className="text-right">Số tiền</span>
            <span>Ghi chú</span>
            <span />
          </div>
          {value.map((row, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1fr_160px_1fr_44px] items-center gap-2 border-b px-3 py-2 last:border-b-0"
            >
              <Input
                placeholder="VD: Tạm ứng tháng 5"
                value={row.name}
                disabled={disabled}
                onChange={(e) => update(idx, { name: e.target.value })}
                className="h-9"
              />
              <VndInput
                value={row.amount}
                disabled={disabled}
                onChange={(v) => update(idx, { amount: v })}
                className="h-9"
              />
              <Input
                placeholder="Tuỳ chọn"
                value={row.note ?? ""}
                disabled={disabled}
                onChange={(e) => update(idx, { note: e.target.value })}
                className="h-9"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                onClick={() => remove(idx)}
                aria-label="Xoá khoản này"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Thêm khấu trừ
        </Button>
      )}
    </div>
  );
}
