"use client";

import { Loader2, TrendingUp, Users, Clock, Award } from "lucide-react";
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

import type { OverviewResponse } from "../types/report";

interface TimesheetOverviewPanelProps {
  data: OverviewResponse | undefined;
  loading?: boolean;
}

function fmtHm(minutes: number): string {
  if (!minutes) return "0";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

function fmtPct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
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

export function TimesheetOverviewPanel({
  data,
  loading,
}: TimesheetOverviewPanelProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Không có dữ liệu cho kỳ này.
      </div>
    );
  }

  const { totals, trend, topLate, topAbsent } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Nhân sự đang làm"
          value={String(totals.activeEmployees)}
        />
        <KpiCard
          icon={Clock}
          label="Tổng giờ công"
          value={fmtHm(totals.totalWorkMinutes)}
        />
        <KpiCard
          icon={TrendingUp}
          label="Tổng giờ OT"
          value={fmtHm(totals.totalOTMinutes)}
        />
        <KpiCard
          icon={Award}
          label="Tỷ lệ chuyên cần"
          value={fmtPct(totals.attendanceRate)}
        />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">
              Xu hướng giờ công 6 tháng
            </div>
            <div className="text-xs text-muted-foreground">
              Tổng giờ công + OT của toàn bộ nhân sự
            </div>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trend.map((p) => ({
                month: p.month,
                Giờ_công: Math.round(p.totalWorkMinutes / 60),
                OT: Math.round(p.totalOTMinutes / 60),
              }))}
              margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
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
                dataKey="Giờ_công"
                stroke="#1d4ed8"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="OT"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 text-sm font-medium">Top đi muộn</div>
          {topLate.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Không có ai đi muộn trong kỳ này 🎉
            </p>
          ) : (
            <ul className="space-y-2">
              {topLate.map((r) => (
                <li
                  key={r.employeeId}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.name ?? r.code}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {r.code}
                    </div>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <div className="font-medium">{r.value} lần</div>
                    {r.detail !== undefined && (
                      <div className="text-[10px] text-muted-foreground">
                        {fmtHm(r.detail)}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-3 text-sm font-medium">Top vắng nhiều</div>
          {topAbsent.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Không có ai vắng trong kỳ này.
            </p>
          ) : (
            <ul className="space-y-2">
              {topAbsent.map((r) => (
                <li
                  key={r.employeeId}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.name ?? r.code}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {r.code}
                    </div>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <div className="font-medium text-destructive">
                      {r.value} ngày
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
