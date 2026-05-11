"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Archive, MoreVertical, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  useArchivePlan,
  useDeletePlan,
} from "../../hooks/useOnboardingPlans";
import type { OnboardingPlanDetail } from "../../types";

import { PlanProgressBar } from "./PlanProgressBar";
import { PlanStatusBadge } from "./PlanStatusBadge";

interface PlanHeaderProps {
  plan: OnboardingPlanDetail;
}

export function PlanHeader({ plan }: PlanHeaderProps) {
  const router = useRouter();
  const archiveMut = useArchivePlan();
  const deleteMut = useDeletePlan();
  const [busy, setBusy] = useState(false);

  const user = plan.employee.user;
  const dept = plan.employee.department;
  const total = plan.tasks.length;
  const done = plan.tasks.filter((t) => t.status === "DONE").length;

  const canArchive = plan.view.canArchive;
  const canDelete = plan.view.canDelete;
  const showMenu = canArchive || canDelete;

  const handleArchive = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await archiveMut.mutateAsync(plan.id);
      toast.success("Đã lưu trữ kế hoạch");
    } catch (err) {
      toast.error("Không lưu trữ được", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (busy) return;
    if (!confirm("Xoá vĩnh viễn kế hoạch onboarding này?")) return;
    setBusy(true);
    try {
      await deleteMut.mutateAsync(plan.id);
      toast.success("Đã xoá kế hoạch");
      router.push("/onboarding");
    } catch (err) {
      toast.error("Không xoá được", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <header className="sticky top-0 z-10 shrink-0 border-b bg-background/95 px-6 py-4 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-12 w-12">
            {user?.avatar && (
              <AvatarImage src={user.avatar} alt={user.name ?? user.email} />
            )}
            <AvatarFallback>
              {avatarInitials(user?.name, user?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold leading-tight">
              {user?.name ?? "(chưa có tên)"}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {plan.employee.code}
              {dept ? ` · ${dept.name}` : ""}
              {user?.email ? ` · ${user.email}` : ""}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Mẫu: {plan.templateNameSnapshot} · Tạo{" "}
              {format(new Date(plan.createdAt), "dd/MM/yyyy", { locale: vi })}
            </p>
          </div>
        </div>

        <div className="flex min-w-[220px] flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <PlanStatusBadge status={plan.status} />
            {showMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label="Thao tác"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {canArchive && (
                    <DropdownMenuItem onClick={handleArchive} disabled={busy}>
                      <Archive className="mr-2 h-4 w-4" /> Lưu trữ
                    </DropdownMenuItem>
                  )}
                  {canArchive && canDelete && <DropdownMenuSeparator />}
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={handleDelete}
                      disabled={busy}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Xoá vĩnh viễn
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="w-full max-w-xs">
            <PlanProgressBar done={done} total={total} size="md" />
          </div>
        </div>
      </div>

      {plan.status === "ARCHIVED" && (
        <div className="mt-3 rounded-md border border-muted-foreground/20 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Plan đã lưu trữ — không thể chỉnh sửa.
        </div>
      )}
    </header>
  );
}

function avatarInitials(name: string | null | undefined, email?: string): string {
  const source = name && name.trim() ? name : email ?? "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}
