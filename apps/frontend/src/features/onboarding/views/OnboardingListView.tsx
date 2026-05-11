"use client";

import { Loader2, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsAdmin, useIsAppAdmin } from "@/features/auth";

import { useOnboardingPlans } from "../hooks/useOnboardingPlans";
import { PlanCard } from "../components/plan/PlanCard";
import { PlanCreateDialog } from "../components/plan/PlanCreateDialog";
import type { OnboardingPlanStatus } from "../types";

const STATUS_FILTERS: { value: "ALL" | OnboardingPlanStatus; label: string }[] =
  [
    { value: "ALL", label: "Tất cả" },
    { value: "PENDING", label: "Chờ bắt đầu" },
    { value: "IN_PROGRESS", label: "Đang chạy" },
    { value: "COMPLETED", label: "Hoàn thành" },
    { value: "ARCHIVED", label: "Đã lưu trữ" },
  ];

export function OnboardingListView() {
  const isAdmin = useIsAdmin();
  const isHrmAdmin = useIsAppAdmin("HRM");
  const showAdmin = isAdmin || isHrmAdmin;

  const [status, setStatus] = useState<"ALL" | OnboardingPlanStatus>("ALL");
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const plansQ = useOnboardingPlans({
    status: status === "ALL" ? undefined : status,
  });

  const filtered = useMemo(() => {
    const list = plansQ.data ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((p) => {
      const code = p.employee.code.toLowerCase();
      const name = (p.employee.user?.name ?? "").toLowerCase();
      const email = (p.employee.user?.email ?? "").toLowerCase();
      return (
        code.includes(needle) ||
        name.includes(needle) ||
        email.includes(needle)
      );
    });
  }, [plansQ.data, q]);

  const activeCount = useMemo(
    () =>
      (plansQ.data ?? []).filter(
        (p) => p.status === "PENDING" || p.status === "IN_PROGRESS",
      ).length,
    [plansQ.data],
  );

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold leading-tight">
            Quy trình onboarding
          </h1>
          <p className="text-xs text-muted-foreground">
            {activeCount} kế hoạch đang chạy.
          </p>
        </div>
        {showAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tạo plan
          </Button>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, email hoặc mã NV"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 pl-7"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as typeof status)}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {plansQ.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải kế hoạch…
          </div>
        ) : plansQ.error ? (
          <p className="text-sm text-destructive">
            Lỗi: {(plansQ.error as Error).message}
          </p>
        ) : filtered.length === 0 ? (
          <EmptyState
            hasFilter={q.trim().length > 0 || status !== "ALL"}
            canCreate={showAdmin}
            onCreate={() => setCreateOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <PlanCard key={p.id} plan={p} />
            ))}
          </div>
        )}
      </div>

      {showAdmin && (
        <PlanCreateDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  );
}

function EmptyState({
  hasFilter,
  canCreate,
  onCreate,
}: {
  hasFilter: boolean;
  canCreate: boolean;
  onCreate: () => void;
}) {
  if (hasFilter) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm font-medium">Không có kế hoạch nào phù hợp</p>
        <p className="text-xs text-muted-foreground">
          Thử bỏ bớt bộ lọc hoặc đổi từ khoá tìm kiếm.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <p className="text-sm font-medium">Chưa có quy trình onboarding nào</p>
      <p className="max-w-md text-xs text-muted-foreground">
        Tạo template tại{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
          /settings/onboarding
        </code>{" "}
        và thêm nhân viên mới — plan sẽ tự sinh.
      </p>
      {canCreate && (
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo plan thủ công
        </Button>
      )}
    </div>
  );
}
