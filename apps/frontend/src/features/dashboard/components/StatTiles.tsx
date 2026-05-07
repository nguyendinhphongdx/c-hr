"use client";

import { CalendarCheck2, ClipboardList, Inbox } from "lucide-react";
import { useMemo, type ReactNode } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/features/auth";
import { useRequests } from "@/features/requests";
import { useTimesheet } from "@/features/timesheet";
import { cn } from "@/lib/utils";

interface TileData {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone: "default" | "warn" | "ok";
}

const TONE_CLASS: Record<TileData["tone"], string> = {
  default: "text-foreground",
  warn: "text-amber-600 dark:text-amber-400",
  ok: "text-emerald-600 dark:text-emerald-400",
};

export function StatTiles() {
  const { user } = useAuth();
  const employeeId = user?.employeeId ?? null;
  const today = new Date();

  const incoming = useRequests({ scope: "incoming" });
  const mine = useRequests({ scope: "mine" });
  const sheet = useTimesheet(employeeId, today.getFullYear(), today.getMonth() + 1);

  const incomingPending = useMemo(
    () => (incoming.data ?? []).filter((r) => r.status === "PENDING").length,
    [incoming.data],
  );
  const minePending = useMemo(
    () => (mine.data ?? []).filter((r) => r.status === "PENDING").length,
    [mine.data],
  );
  const presentDays = useMemo(() => {
    if (!sheet.data) return 0;
    return sheet.data.days.filter(
      (d) => d.checkInAt && d.status !== "ABSENT" && d.status !== "WEEKEND",
    ).length;
  }, [sheet.data]);

  const tiles: TileData[] = [
    {
      label: "Cần tôi duyệt",
      value: incoming.isLoading ? "…" : String(incomingPending),
      hint: "Đơn đang chờ bạn xử lý",
      icon: <Inbox className="h-4 w-4" />,
      tone: incomingPending > 0 ? "warn" : "default",
    },
    {
      label: "Đơn của tôi",
      value: mine.isLoading ? "…" : String(minePending),
      hint: "Đơn bạn gửi đang chờ duyệt",
      icon: <ClipboardList className="h-4 w-4" />,
      tone: "default",
    },
    {
      label: "Ngày làm tháng này",
      value: sheet.isLoading ? "…" : String(presentDays),
      hint: `Tháng ${today.getMonth() + 1}/${today.getFullYear()}`,
      icon: <CalendarCheck2 className="h-4 w-4" />,
      tone: presentDays > 0 ? "ok" : "default",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {tiles.map((t) => (
        <Card key={t.label}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t.label}</span>
              {t.icon}
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-semibold tabular-nums", TONE_CLASS[t.tone])}>
              {t.value}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
