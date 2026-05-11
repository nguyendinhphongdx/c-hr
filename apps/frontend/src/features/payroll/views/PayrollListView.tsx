"use client";

import { Loader2, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { PeriodCard } from "../components/period/PeriodCard";
import { PeriodCreateDialog } from "../components/period/PeriodCreateDialog";
import { usePayrollPeriods } from "../hooks/usePayrollPeriods";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  CURRENT_YEAR - 2,
  CURRENT_YEAR - 1,
  CURRENT_YEAR,
  CURRENT_YEAR + 1,
];

export function PayrollListView() {
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error } = usePayrollPeriods({ year });

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold leading-tight">Bảng lương</h1>
          <p className="text-xs text-muted-foreground">
            Quản lý kỳ lương theo tháng — tạo, đóng, trả, mở lại.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo kỳ lương
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Năm</span>
          <Select
            value={String(year)}
            onValueChange={(v) => setYear(Number(v))}
          >
            <SelectTrigger className="h-9 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải kỳ lương…
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">
            Lỗi: {(error as Error).message}
          </p>
        ) : !data || data.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.map((p) => (
              <PeriodCard key={p.id} period={p} />
            ))}
          </div>
        )}
      </div>

      <PeriodCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <p className="text-sm font-medium">Chưa có kỳ lương nào</p>
      <p className="text-xs text-muted-foreground">
        Bấm + Tạo kỳ lương để bắt đầu.
      </p>
      <Button onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" />
        Tạo kỳ lương
      </Button>
    </div>
  );
}
