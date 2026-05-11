"use client";

import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  /** Optional tint for accent — defaults to primary. */
  tone?: "primary" | "warning" | "success" | "muted";
}

const TONES: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-orange-500/10 text-orange-600",
  success: "bg-emerald-500/10 text-emerald-600",
  muted: "bg-muted text-muted-foreground",
};

export function KpiCard({ icon: Icon, label, value, hint, tone = "primary" }: KpiCardProps) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          TONES[tone],
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </div>
    </Card>
  );
}
