"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const VND_FORMATTER = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

export function formatVnd(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return VND_FORMATTER.format(Math.round(value));
}

export function formatVndCurrency(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "0 ₫";
  return `${VND_FORMATTER.format(Math.round(num))} ₫`;
}

/** Strip everything but digits — handles "1.000.000" / "1 000 000" / "1,000". */
export function parseVnd(input: string): number {
  const digits = input.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const num = Number(digits);
  return Number.isFinite(num) ? num : 0;
}

interface VndInputProps {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  id?: string;
}

/**
 * Number input that displays VND with thousand separators on blur. While
 * focused, shows the raw digit string so the user can edit naturally.
 */
export function VndInput({
  value,
  onChange,
  disabled,
  className,
  placeholder,
  id,
}: VndInputProps) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState<string>(() => String(value || ""));
  // Keep the local raw string in sync with the external value while the
  // input is NOT focused — derived in render rather than via useEffect to
  // avoid cascading-render lint and the extra commit.
  const [syncedFor, setSyncedFor] = useState<number>(value);
  if (!focused && syncedFor !== value) {
    setSyncedFor(value);
    setRaw(String(value || ""));
  }

  const display = focused
    ? raw
    : value
      ? formatVnd(value)
      : "";

  return (
    <Input
      id={id}
      inputMode="numeric"
      disabled={disabled}
      placeholder={placeholder ?? "0"}
      value={display}
      onFocus={() => {
        setFocused(true);
        setRaw(String(value || ""));
      }}
      onChange={(e) => {
        const next = parseVnd(e.target.value);
        setRaw(String(next || ""));
        onChange(next);
      }}
      onBlur={() => setFocused(false)}
      className={cn("text-right tabular-nums", className)}
    />
  );
}
