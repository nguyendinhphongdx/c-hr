"use client";

import {
  CheckCircle2,
  Lock,
  Loader2,
  RefreshCw,
  Trash2,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import {
  useClosePayrollPeriod,
  useDeletePayrollPeriod,
  usePayPayrollPeriod,
  useRecomputePayrollPeriod,
  useReopenPayrollPeriod,
} from "../../hooks/usePayrollPeriods";
import type { PayrollPeriodDetail } from "../../types";

type ConfirmKey = "close" | "pay" | "reopen" | "recompute" | "delete";

interface ConfirmConfig {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
}

const CONFIRMS: Record<ConfirmKey, ConfirmConfig> = {
  close: {
    title: "Đóng kỳ lương?",
    description:
      "Sau khi đóng, items sẽ bị khoá không sửa được. Bạn chỉ có thể Reopen để chỉnh tiếp.",
    confirmLabel: "Đóng kỳ",
  },
  pay: {
    title: "Đánh dấu đã trả lương?",
    description:
      "Khoá vĩnh viễn kỳ lương này — không thể sửa hoặc Reopen sau khi đánh dấu PAID.",
    confirmLabel: "Đã trả lương",
  },
  reopen: {
    title: "Mở lại kỳ lương?",
    description:
      "Đưa kỳ lương về trạng thái DRAFT để chỉnh sửa. Có thể đóng lại sau.",
    confirmLabel: "Mở lại",
  },
  recompute: {
    title: "Tính lại toàn bộ items?",
    description:
      "Áp lại config + dữ liệu chấm công hiện tại lên mọi item. Các giá trị output (gross/insurance/tax/net) sẽ được ghi đè.",
    confirmLabel: "Tính lại",
  },
  delete: {
    title: "Xoá kỳ lương?",
    description:
      "Xoá kỳ lương và toàn bộ items thuộc kỳ này. Không thể hoàn tác.",
    confirmLabel: "Xoá",
    destructive: true,
  },
};

interface PeriodActionsBarProps {
  period: PayrollPeriodDetail;
}

export function PeriodActionsBar({ period }: PeriodActionsBarProps) {
  const router = useRouter();
  const closeMut = useClosePayrollPeriod();
  const payMut = usePayPayrollPeriod();
  const reopenMut = useReopenPayrollPeriod();
  const recomputeMut = useRecomputePayrollPeriod();
  const deleteMut = useDeletePayrollPeriod();

  const [confirm, setConfirm] = useState<ConfirmKey | null>(null);

  const canClose = period.status === "DRAFT";
  const canPay = period.status === "CLOSED";
  const canReopen = period.status === "CLOSED";
  const canRecompute = period.status === "DRAFT";
  const canDelete = period.status !== "PAID";

  const pending =
    closeMut.isPending ||
    payMut.isPending ||
    reopenMut.isPending ||
    recomputeMut.isPending ||
    deleteMut.isPending;

  const run = async (key: ConfirmKey) => {
    try {
      switch (key) {
        case "close":
          await closeMut.mutateAsync(period.id);
          toast.success("Đã đóng kỳ lương");
          break;
        case "pay":
          await payMut.mutateAsync(period.id);
          toast.success("Đã đánh dấu PAID");
          break;
        case "reopen":
          await reopenMut.mutateAsync(period.id);
          toast.success("Đã mở lại kỳ lương");
          break;
        case "recompute":
          await recomputeMut.mutateAsync(period.id);
          toast.success("Đã tính lại toàn bộ items");
          break;
        case "delete":
          await deleteMut.mutateAsync(period.id);
          toast.success("Đã xoá kỳ lương");
          router.push("/hrm/payroll");
          break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Thao tác thất bại";
      toast.error(msg);
    } finally {
      setConfirm(null);
    }
  };

  const cfg = confirm ? CONFIRMS[confirm] : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canClose && (
          <Button
            type="button"
            size="sm"
            variant="default"
            disabled={pending}
            onClick={() => setConfirm("close")}
          >
            <Lock className="mr-1.5 h-3.5 w-3.5" />
            Đóng kỳ
          </Button>
        )}
        {canPay && (
          <Button
            type="button"
            size="sm"
            variant="default"
            disabled={pending}
            onClick={() => setConfirm("pay")}
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Đã trả lương
          </Button>
        )}
        {canReopen && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setConfirm("reopen")}
          >
            <Undo2 className="mr-1.5 h-3.5 w-3.5" />
            Mở lại
          </Button>
        )}
        {canRecompute && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setConfirm("recompute")}
          >
            {recomputeMut.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Tính lại
          </Button>
        )}
        {canDelete && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => setConfirm("delete")}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Xoá
          </Button>
        )}
      </div>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(v) => !v && setConfirm(null)}
      >
        <AlertDialogContent>
          {cfg && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{cfg.title}</AlertDialogTitle>
                <AlertDialogDescription>
                  {cfg.description}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel>
                <AlertDialogAction
                  disabled={pending}
                  onClick={() => confirm && run(confirm)}
                  className={
                    cfg.destructive
                      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      : undefined
                  }
                >
                  {pending && (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  )}
                  {cfg.confirmLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
