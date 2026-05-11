"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { WorkloadHeatmap as HeatmapData } from "../../types/report";

interface WorkloadHeatmapProps {
  data: HeatmapData;
}

function dayLabel(iso: string): { dd: string; weekday: string } {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dd = String(d).padStart(2, "0");
  const weekdayMap = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return { dd, weekday: weekdayMap[date.getUTCDay()] };
}

function intensityClass(count: number): string {
  if (count <= 0) return "bg-muted/30";
  if (count === 1) return "bg-blue-200 dark:bg-blue-900/50";
  if (count === 2) return "bg-blue-300 dark:bg-blue-800/70";
  if (count <= 4) return "bg-blue-400 dark:bg-blue-700/80";
  return "bg-blue-600 dark:bg-blue-600";
}

function initials(name: string | null, userId: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "");
  }
  return userId.slice(0, 2).toUpperCase();
}

/**
 * Heatmap: rows = employees with at least 1 task in the window, cols =
 * next 14 days. Cell intensity scales with task count due that day.
 * Rendered as a CSS grid — no recharts dependency needed and the layout
 * stays predictable across screen sizes (caller wraps in overflow-x).
 */
export function WorkloadHeatmap({ data }: WorkloadHeatmapProps) {
  const { days, rows } = data;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Khối lượng 14 ngày tới</div>
          <div className="text-xs text-muted-foreground">
            Số task đến hạn theo người nhận
          </div>
        </div>
        <Legend />
      </div>

      {rows.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          Không có task nào đến hạn trong 14 ngày tới.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div
            className="grid items-center gap-1 text-xs"
            style={{
              gridTemplateColumns: `minmax(180px, 1fr) repeat(${days.length}, minmax(32px, 1fr))`,
            }}
          >
            {/* Header row */}
            <div />
            {days.map((d) => {
              const { dd, weekday } = dayLabel(d);
              return (
                <div
                  key={d}
                  className="flex flex-col items-center text-[10px] text-muted-foreground"
                  title={d}
                >
                  <span>{weekday}</span>
                  <span className="font-medium text-foreground">{dd}</span>
                </div>
              );
            })}

            {/* Body */}
            {rows.map((row) => (
              <RowCells key={row.userId} row={row} days={days} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function RowCells({
  row,
  days,
}: {
  row: HeatmapData["rows"][number];
  days: string[];
}) {
  return (
    <>
      <div className="flex min-w-0 items-center gap-2 pr-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
          {row.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.avatar}
              alt=""
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            initials(row.name, row.userId)
          )}
        </div>
        <span className="truncate text-sm">
          {row.name ?? "(Không tên)"}
        </span>
      </div>
      {days.map((d, i) => {
        const count = row.counts[i] ?? 0;
        return (
          <div
            key={d}
            title={`${d}: ${count} task`}
            className={cn(
              "flex h-7 items-center justify-center rounded text-[10px] font-medium tabular-nums",
              intensityClass(count),
              count > 0 ? "text-foreground" : "text-transparent",
            )}
          >
            {count > 0 ? count : ""}
          </div>
        );
      })}
    </>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
      <span>Ít</span>
      <span className="h-3 w-3 rounded bg-muted/30" />
      <span className="h-3 w-3 rounded bg-blue-200 dark:bg-blue-900/50" />
      <span className="h-3 w-3 rounded bg-blue-300 dark:bg-blue-800/70" />
      <span className="h-3 w-3 rounded bg-blue-400 dark:bg-blue-700/80" />
      <span className="h-3 w-3 rounded bg-blue-600" />
      <span>Nhiều</span>
    </div>
  );
}
