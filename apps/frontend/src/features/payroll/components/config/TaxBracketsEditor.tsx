"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { TaxBracket } from "../../types";

interface Props {
  value: TaxBracket[];
  onChange: (next: TaxBracket[]) => void;
  disabled?: boolean;
}

export function TaxBracketsEditor({ value, onChange, disabled }: Props) {
  const update = (idx: number, patch: Partial<TaxBracket>) => {
    const next = value.map((b, i) => (i === idx ? { ...b, ...patch } : b));
    onChange(next);
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const add = () => {
    const lastUpto = value
      .map((b) => b.upto)
      .filter((u): u is number => typeof u === "number")
      .reduce((m, n) => (n > m ? n : m), 0);
    onChange([...value, { upto: lastUpto + 1_000_000, rate: 0.05 }]);
  };

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Bậc</TableHead>
            <TableHead>Đến mức (VND/tháng)</TableHead>
            <TableHead className="w-40">Thuế suất (%)</TableHead>
            <TableHead className="w-20 text-right">Xoá</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {value.map((b, idx) => (
            <TableRow key={idx}>
              <TableCell className="text-sm text-muted-foreground">{idx + 1}</TableCell>
              <TableCell>
                <Input
                  inputMode="numeric"
                  placeholder="(để trống = bậc cuối)"
                  value={b.upto == null ? "" : String(b.upto)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d]/g, "");
                    update(idx, { upto: raw === "" ? null : Number(raw) });
                  }}
                  disabled={disabled}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.5"
                  min={0}
                  max={100}
                  value={String(Math.round(b.rate * 10000) / 100)}
                  onChange={(e) => {
                    const pct = Number.parseFloat(e.target.value);
                    update(idx, {
                      rate: Number.isFinite(pct) ? pct / 100 : 0,
                    });
                  }}
                  disabled={disabled}
                />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(idx)}
                  disabled={disabled}
                  aria-label={`Xoá bậc ${idx + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        disabled={disabled}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Thêm bậc
      </Button>
      <p className="text-xs text-muted-foreground">
        Bậc cuối cùng để trống <em>Đến mức</em> = vô cực. Thuế suất nhập theo %
        (vd 5 = 5%).
      </p>
    </div>
  );
}
