"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { OtRates } from "../../types";

interface Props {
  value: OtRates;
  onChange: (next: OtRates) => void;
  disabled?: boolean;
}

const FIELDS: { key: keyof OtRates; label: string; hint?: string }[] = [
  { key: "weekday", label: "Ngày thường", hint: "Mức tối thiểu theo luật: 1.5" },
  { key: "weekend", label: "Cuối tuần", hint: "Mức tối thiểu: 2.0" },
  { key: "holiday", label: "Ngày lễ / Tết", hint: "Mức tối thiểu: 3.0" },
  { key: "night", label: "Ban đêm", hint: "Cộng thêm 30% — dùng cho v2" },
];

export function OtRatesEditor({ value, onChange, disabled }: Props) {
  const set = (key: keyof OtRates, raw: string) => {
    const num = Number.parseFloat(raw);
    onChange({ ...value, [key]: Number.isFinite(num) ? num : 0 });
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {FIELDS.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label htmlFor={`ot-${f.key}`}>{f.label}</Label>
          <Input
            id={`ot-${f.key}`}
            type="number"
            step="0.1"
            min={1}
            value={String(value[f.key] ?? 1)}
            onChange={(e) => set(f.key, e.target.value)}
            disabled={disabled}
          />
          {f.hint && (
            <p className="text-xs text-muted-foreground">{f.hint}</p>
          )}
        </div>
      ))}
    </div>
  );
}
