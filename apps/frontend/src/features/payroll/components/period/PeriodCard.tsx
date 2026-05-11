"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Users } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

import type { PayrollPeriodRow } from "../../types";
import { formatVndCurrency } from "../item/VndInput";

import { PeriodStatusBadge } from "./PeriodStatusBadge";

interface PeriodCardProps {
  period: PayrollPeriodRow;
}

function periodTitle(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  return `Tháng ${Number(month)}/${year}`;
}

export function PeriodCard({ period }: PeriodCardProps) {
  const itemCount = period._count?.items ?? 0;
  const stamp =
    period.status === "PAID" && period.paidAt
      ? `Đã trả ${format(new Date(period.paidAt), "HH:mm dd/MM/yyyy", { locale: vi })}`
      : period.status === "CLOSED" && period.closedAt
        ? `Đã đóng ${format(new Date(period.closedAt), "HH:mm dd/MM/yyyy", { locale: vi })}`
        : `Tạo ${format(new Date(period.createdAt), "dd/MM/yyyy", { locale: vi })}`;

  return (
    <Link href={`/payroll/${period.monthKey}`} className="block">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight">
              {periodTitle(period.monthKey)}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {period.monthKey}
            </div>
          </div>
          <PeriodStatusBadge status={period.status} />
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{itemCount} nhân viên</span>
          </div>
          <div className="text-xs text-muted-foreground">Tổng thực nhận</div>
          <div className="font-semibold tabular-nums">
            {formatVndCurrency(period.totalNetPay ?? 0)}
          </div>
          <div className="border-t pt-2 text-[11px] text-muted-foreground">
            {stamp}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
