"use client";

import {
  BadgeDollarSign,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import type { PayrollItemRow } from "../../types";
import { formatVndCurrency } from "../item/VndInput";

interface PeriodKpiBarProps {
  items: PayrollItemRow[];
}

function sumDecimal(items: PayrollItemRow[], key: keyof PayrollItemRow): number {
  return items.reduce((acc, item) => {
    const raw = item[key];
    const num = typeof raw === "string" ? Number(raw) : 0;
    return acc + (Number.isFinite(num) ? num : 0);
  }, 0);
}

export function PeriodKpiBar({ items }: PeriodKpiBarProps) {
  const totalGross = sumDecimal(items, "grossIncome");
  const totalInsurance = sumDecimal(items, "insuranceTotal");
  const totalNet = sumDecimal(items, "netPay");

  const tiles: { label: string; value: string; icon: React.ReactNode }[] = [
    {
      label: "Số nhân viên",
      value: String(items.length),
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: "Tổng thu nhập (gross)",
      value: formatVndCurrency(totalGross),
      icon: <BadgeDollarSign className="h-4 w-4" />,
    },
    {
      label: "Tổng bảo hiểm",
      value: formatVndCurrency(totalInsurance),
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
      label: "Tổng thực nhận (net)",
      value: formatVndCurrency(totalNet),
      icon: <ReceiptText className="h-4 w-4" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((t) => (
        <Card key={t.label}>
          <CardContent className="flex items-start justify-between gap-2 py-4">
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t.label}
              </div>
              <div className="mt-1 truncate text-base font-semibold tabular-nums">
                {t.value}
              </div>
            </div>
            <div className="rounded-md bg-muted p-2 text-muted-foreground">
              {t.icon}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
