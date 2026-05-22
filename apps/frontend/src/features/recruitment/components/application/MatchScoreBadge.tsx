"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { MatchBreakdown } from "../../types";

interface MatchScoreBadgeProps {
  score: number | null;
  breakdown?: MatchBreakdown | null;
  /** Compact variant on application cards; default = full size. */
  compact?: boolean;
}

function scoreTone(score: number): string {
  if (score >= 80)
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (score >= 60)
    return "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300";
  if (score >= 40)
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
}

export function MatchScoreBadge({
  score,
  breakdown,
  compact,
}: MatchScoreBadgeProps) {
  if (score === null || score === undefined) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-muted-foreground",
          compact ? "text-[10px]" : "text-xs",
        )}
        title="Chưa đủ dữ liệu để chấm điểm"
      >
        —
      </span>
    );
  }

  const tone = scoreTone(score);
  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium tabular-nums",
        tone,
        compact ? "text-[10px]" : "text-xs",
      )}
    >
      <span>{score}</span>
      <span className="opacity-70">/100</span>
    </span>
  );

  if (!breakdown) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>{badge}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        <div className="space-y-1.5">
          <div>
            <span className="font-medium">Kỹ năng</span>: {breakdown.skillScore}
            /70
            {breakdown.skillsMatched.length > 0 && (
              <p className="mt-0.5 text-muted-foreground">
                Khớp:{" "}
                <span className="text-foreground">
                  {breakdown.skillsMatched.join(", ")}
                </span>
              </p>
            )}
            {breakdown.skillsMissing.length > 0 && (
              <p className="mt-0.5 text-muted-foreground">
                Thiếu:{" "}
                <span className="text-foreground">
                  {breakdown.skillsMissing.join(", ")}
                </span>
              </p>
            )}
          </div>
          <div>
            <span className="font-medium">Kinh nghiệm</span>:{" "}
            {breakdown.experienceSkipped
              ? "Chưa đủ dữ liệu (bỏ qua)"
              : `${breakdown.experienceScore ?? 0}/30`}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
