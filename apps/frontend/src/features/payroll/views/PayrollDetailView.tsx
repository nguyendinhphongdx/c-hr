"use client";

import { ArrowLeft, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDepartments } from "@/features/departments";

import { ItemEditDialog } from "../components/item/ItemEditDialog";
import { ItemTable } from "../components/item/ItemTable";
import { PeriodActionsBar } from "../components/period/PeriodActionsBar";
import { PeriodKpiBar } from "../components/period/PeriodKpiBar";
import { PeriodStatusBadge } from "../components/period/PeriodStatusBadge";
import { usePayrollItems } from "../hooks/usePayrollItems";
import {
  usePayrollPeriod,
  usePayrollPeriods,
  useUpdatePayrollPeriodNote,
} from "../hooks/usePayrollPeriods";

const DEPT_ALL = "__all__";

interface PayrollDetailViewProps {
  monthKey: string;
}

function periodTitle(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  if (!year || !month) return monthKey;
  return `Bảng lương tháng ${Number(month)}/${year}`;
}

/**
 * BE addresses periods by UUID. We route by monthKey because it's stable
 * and HR-friendly. So step 1 is to resolve the id via the list endpoint
 * (filtered by year), which is cheap — typical SMB has ≤12 periods/year.
 */
export function PayrollDetailView({ monthKey }: PayrollDetailViewProps) {
  const year = Number(monthKey.split("-")[0]);
  const periodsList = usePayrollPeriods({
    year: Number.isFinite(year) ? year : undefined,
  });
  const row = periodsList.data?.find((p) => p.monthKey === monthKey);
  const id = row?.id ?? null;

  const periodDetail = usePayrollPeriod(id);

  const [departmentId, setDepartmentId] = useState<string>(DEPT_ALL);
  const [search, setSearch] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const itemsQuery = useMemo(
    () => ({
      ...(departmentId !== DEPT_ALL ? { departmentId } : {}),
      ...(search.trim() ? { q: search.trim() } : {}),
    }),
    [departmentId, search],
  );
  const items = usePayrollItems(id, itemsQuery);
  const departments = useDepartments();

  const period = periodDetail.data;

  // Wait for the list resolver before deciding the period is missing.
  const resolving = periodsList.isLoading;
  const notFound = !resolving && !row;

  if (resolving || (id && periodDetail.isLoading)) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải kỳ lương…
      </div>
    );
  }

  if (notFound || !period) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm">
        <p>Không tìm thấy kỳ lương <code className="font-mono">{monthKey}</code>.</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/payroll">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Quay lại danh sách
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-10 shrink-0 space-y-4 border-b bg-background px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link href="/payroll" className="hover:text-foreground">
                <ArrowLeft className="inline h-3.5 w-3.5" /> Bảng lương
              </Link>
              <span>·</span>
              <span className="font-mono">{period.monthKey}</span>
            </div>
            <h1 className="flex items-center gap-2 text-lg font-semibold leading-tight">
              {periodTitle(period.monthKey)}
              <PeriodStatusBadge status={period.status} />
            </h1>
            <PeriodNoteInline period={period} />
          </div>

          <PeriodActionsBar period={period} />
        </div>

        <PeriodKpiBar items={items.data ?? []} />
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3">
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Phòng ban" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEPT_ALL}>Tất cả phòng ban</SelectItem>
            {(departments.data ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã / tên / email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-72 pl-7 text-sm"
          />
        </div>

        <div className="ml-auto text-xs text-muted-foreground">
          {items.data?.length ?? 0} item
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {items.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải items…
          </div>
        ) : items.error ? (
          <p className="text-sm text-destructive">
            Lỗi: {(items.error as Error).message}
          </p>
        ) : (
          <ItemTable
            items={items.data ?? []}
            onEdit={setEditingItemId}
            canEdit={period.status === "DRAFT"}
          />
        )}
      </div>

      <ItemEditDialog
        itemId={editingItemId}
        onClose={() => setEditingItemId(null)}
        periodStatus={period.status}
      />
    </div>
  );
}

function PeriodNoteInline({
  period,
}: {
  period: { id: string; status: string; note: string | null };
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(period.note ?? "");
  const updateNote = useUpdatePayrollPeriodNote();

  const canEdit = period.status === "DRAFT";

  const save = async () => {
    try {
      await updateNote.mutateAsync({ id: period.id, note: draft.trim() });
      setEditing(false);
      toast.success("Đã lưu ghi chú");
    } catch (err) {
      toast.error("Không lưu được", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  if (editing && canEdit) {
    return (
      <div className="max-w-2xl space-y-2 pt-1">
        <Textarea
          rows={2}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ghi chú nội bộ..."
        />
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={updateNote.isPending}
          >
            {updateNote.isPending && (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            )}
            Lưu
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(period.note ?? "");
              setEditing(false);
            }}
          >
            Huỷ
          </Button>
        </div>
      </div>
    );
  }

  if (!period.note) {
    if (!canEdit) return null;
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        + Thêm ghi chú
      </button>
    );
  }

  return (
    <p
      className={`max-w-2xl text-xs text-muted-foreground ${canEdit ? "cursor-text rounded-sm hover:bg-accent/40" : ""}`}
      onClick={() => canEdit && setEditing(true)}
    >
      {period.note}
    </p>
  );
}
