"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import type { AllowanceRow } from "../../types";

import { VndInput } from "./VndInput";

interface AllowanceRowsEditorProps {
  value: AllowanceRow[];
  onChange: (next: AllowanceRow[]) => void;
  disabled?: boolean;
}

const EMPTY: AllowanceRow = {
  name: "",
  amount: 0,
  taxable: true,
  insurable: false,
};

export function AllowanceRowsEditor({
  value,
  onChange,
  disabled,
}: AllowanceRowsEditorProps) {
  const update = (idx: number, patch: Partial<AllowanceRow>) => {
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
          Chưa có phụ cấp. Bấm <em>+ Thêm phụ cấp</em> để bổ sung (ăn trưa, đi
          lại, điện thoại…).
        </p>
      )}

      {value.length > 0 && (
        <div className="rounded-md border">
          <div className="grid grid-cols-[1fr_160px_100px_100px_44px] items-center gap-2 border-b bg-muted/30 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <span>Tên khoản</span>
            <span className="text-right">Số tiền</span>
            <span className="text-center">Chịu thuế</span>
            <span className="text-center">Tính BH</span>
            <span />
          </div>
          {value.map((row, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1fr_160px_100px_100px_44px] items-center gap-2 border-b px-3 py-2 last:border-b-0"
            >
              <Input
                placeholder="VD: Phụ cấp ăn trưa"
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
              <div className="flex justify-center">
                <Switch
                  checked={row.taxable}
                  disabled={disabled}
                  onCheckedChange={(v) => update(idx, { taxable: v })}
                />
              </div>
              <div className="flex justify-center">
                <Switch
                  checked={row.insurable}
                  disabled={disabled}
                  onCheckedChange={(v) => update(idx, { insurable: v })}
                />
              </div>
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
          Thêm phụ cấp
        </Button>
      )}

      <div className="space-y-1 text-[11px] text-muted-foreground">
        <p>
          <Label className="inline text-xs">Chịu thuế</Label>: bật nếu khoản
          này cộng vào thu nhập chịu thuế TNCN (mặc định bật).
        </p>
        <p>
          <Label className="inline text-xs">Tính BH</Label>: bật nếu khoản
          này cộng vào mức đóng BHXH/BHYT/BHTN (hiếm gặp — phụ cấp chức vụ).
        </p>
      </div>
    </div>
  );
}
