"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { RegionMinWage } from "../../types";

interface Props {
  value: RegionMinWage;
  onChange: (next: RegionMinWage) => void;
  disabled?: boolean;
}

const REGIONS: { key: keyof RegionMinWage; label: string }[] = [
  { key: "REGION_I", label: "Vùng I" },
  { key: "REGION_II", label: "Vùng II" },
  { key: "REGION_III", label: "Vùng III" },
  { key: "REGION_IV", label: "Vùng IV" },
];

export function RegionMinWageEditor({ value, onChange, disabled }: Props) {
  const set = (key: keyof RegionMinWage, raw: string) => {
    const num = Number(raw.replace(/[^\d]/g, ""));
    onChange({ ...value, [key]: Number.isFinite(num) ? num : 0 });
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {REGIONS.map((r) => (
        <div key={r.key} className="space-y-1.5">
          <Label htmlFor={`min-wage-${r.key}`}>{r.label}</Label>
          <Input
            id={`min-wage-${r.key}`}
            inputMode="numeric"
            value={String(value[r.key] ?? 0)}
            onChange={(e) => set(r.key, e.target.value)}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}
