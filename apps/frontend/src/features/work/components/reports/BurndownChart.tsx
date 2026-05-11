"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";

import type { BurndownPoint } from "../../types/report";

interface BurndownChartProps {
  data: BurndownPoint[];
}

function shortDate(d: string): string {
  // "2026-05-07" → "07/05"
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}`;
}

export function BurndownChart({ data }: BurndownChartProps) {
  return (
    <Card className="p-4">
      <div className="mb-3">
        <div className="text-sm font-medium">Burndown</div>
        <div className="text-xs text-muted-foreground">
          Số task chưa hoàn thành theo từng ngày
        </div>
      </div>
      {data.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          Chưa có đủ dữ liệu để vẽ biểu đồ.
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data.map((p) => ({
                date: shortDate(p.date),
                Đang_mở: p.openCount,
              }))}
              margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="Đang_mở"
                stroke="#1d4ed8"
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
