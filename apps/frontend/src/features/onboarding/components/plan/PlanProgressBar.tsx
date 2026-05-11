import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PlanProgressBarProps {
  done: number;
  total: number;
  className?: string;
  size?: "sm" | "md";
  /** Hide the inline `X/Y nhiệm vụ` label (still kept in the tooltip). */
  hideLabel?: boolean;
}

export function PlanProgressBar({
  done,
  total,
  className,
  size = "sm",
  hideLabel = false,
}: PlanProgressBarProps) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const heightClass = size === "md" ? "h-2" : "h-1.5";

  return (
    <div className={cn("w-full", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${done} / ${total} nhiệm vụ`}
            className={cn(
              "relative w-full overflow-hidden rounded-full bg-muted",
              heightClass,
            )}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all",
                pct === 100 ? "bg-emerald-500" : "bg-blue-500",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          {done} / {total} nhiệm vụ ({pct}%)
        </TooltipContent>
      </Tooltip>
      {!hideLabel && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {done} / {total} nhiệm vụ
        </p>
      )}
    </div>
  );
}
