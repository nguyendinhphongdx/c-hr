"use client";

import { ChevronDown, Loader2, Plus, Search, Upload, UserPlus } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer } from "@/components/layout/PageContainer";
import { useIsAppAdmin } from "@/features/auth";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

import { EmployeeCreateDialog } from "../components/EmployeeCreateDialog";
import { EmployeeDetailSheet } from "../components/EmployeeDetailSheet";
import { EmployeeEditDialog } from "../components/EmployeeEditDialog";
import { EmployeeImportDialog } from "../components/EmployeeImportDialog";
import { EmployeeRowActions } from "../components/EmployeeRowActions";
import {
  useDeleteEmployee,
  useEmployees,
  useUpdateEmployeeRole,
} from "../hooks/useEmployees";
import type { EmployeeStatus, Role } from "../types";

const PAGE_SIZE = 20;

const STATUSES: { value: EmployeeStatus; label: string }[] = [
  { value: "ACTIVE", label: "Đang làm" },
  { value: "ON_LEAVE", label: "Đang nghỉ" },
  { value: "TERMINATED", label: "Đã nghỉ việc" },
];

const statusVariant: Record<EmployeeStatus, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  ON_LEAVE: "secondary",
  TERMINATED: "outline",
};

const ROLE_LABEL: Record<Role, string> = {
  sysowner: "Chủ hệ thống",
  admin: "Admin Org",
  user: "Nhân viên",
};

const ROLE_BADGE_CLASS: Record<Role, string> = {
  sysowner:
    "border-purple-300 bg-purple-100 text-purple-700 dark:border-purple-800/60 dark:bg-purple-900/40 dark:text-purple-300",
  admin:
    "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-800/60 dark:bg-blue-900/40 dark:text-blue-300",
  user: "border-border bg-muted text-muted-foreground",
};

export function EmployeeListView() {
  const canManage = useIsAppAdmin("HRM");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<EmployeeStatus | "all">("all");
  const [page, setPage] = useState(1);

  const [viewingId, setViewingId] = useState<ID | null>(null);
  const [editingId, setEditingId] = useState<ID | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: ID; name: string } | null>(
    null,
  );

  const list = useEmployees({
    q: q.trim() || undefined,
    status: status === "all" ? undefined : status,
    page,
    limit: PAGE_SIZE,
  });
  const remove = useDeleteEmployee();
  const updateRole = useUpdateEmployeeRole();

  const onChangeRole = async (id: ID, role: Role) => {
    try {
      await updateRole.mutateAsync({ id, role });
      toast.success(`Đã đổi vai trò → ${ROLE_LABEL[role]}`);
    } catch (err) {
      toast.error("Không đổi được vai trò", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1;

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget.id);
      toast.success(`Đã xoá ${deleteTarget.name}`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error("Không xoá được", {
        description: err instanceof Error ? err.message : "Thử lại sau.",
      });
    }
  };

  return (
    <PageContainer>
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nhân sự</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hồ sơ nhân sự — tìm kiếm, lọc và quản lý (HRM admin).
          </p>
        </div>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Thêm nhân sự
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCreating(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Thêm 1 nhân sự
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImporting(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import từ file
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, email hoặc mã"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as EmployeeStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="md:w-[180px]">
            <SelectValue placeholder="Tất cả trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-background">
        {list.isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải nhân sự…
          </div>
        ) : list.error ? (
          <p className="p-6 text-sm text-destructive">
            Không tải được nhân sự.
          </p>
        ) : !list.data?.data.length ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Không có nhân sự phù hợp với bộ lọc.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Mã</th>
                <th className="px-4 py-3 font-medium">Họ tên</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Chức danh</th>
                <th className="px-4 py-3 font-medium">Vai trò</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.data.data.map((emp) => (
                <tr
                  key={emp.id}
                  className="cursor-pointer transition-colors hover:bg-accent/30"
                  onClick={() => setViewingId(emp.id)}
                >
                  <td className="px-4 py-3 font-mono text-xs">{emp.code}</td>
                  <td className="px-4 py-3 font-medium">
                    {emp.user?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {emp.user?.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {emp.title ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {emp.user?.role ? (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px]",
                          ROLE_BADGE_CLASS[emp.user.role],
                        )}
                      >
                        {ROLE_LABEL[emp.user.role]}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[emp.status]}>
                      {emp.status.replace("_", " ").toLowerCase()}
                    </Badge>
                  </td>
                  <td
                    className="px-2 py-2 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <EmployeeRowActions
                      id={emp.id}
                      canManage={canManage}
                      onView={(id) => setViewingId(id)}
                      onEdit={(id) => setEditingId(id)}
                      onDelete={(id) =>
                        setDeleteTarget({
                          id,
                          name: emp.user?.name ?? emp.code,
                        })
                      }
                      onChangeRole={onChangeRole}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {list.data && list.data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Hiển thị {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, list.data.total)} / {list.data.total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Trước
            </Button>
            <span>
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      <EmployeeDetailSheet
        id={viewingId}
        onClose={() => setViewingId(null)}
      />
      <EmployeeEditDialog
        id={editingId}
        onClose={() => setEditingId(null)}
      />
      <EmployeeCreateDialog
        open={creating}
        onClose={() => setCreating(false)}
      />
      <EmployeeImportDialog
        open={importing}
        onClose={() => setImporting(false)}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá nhân sự?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  Soft-delete &quot;{deleteTarget.name}&quot;? Họ sẽ không xuất
                  hiện trong danh sách nữa nhưng row vẫn được giữ trong DB cho
                  history (audit log + reports).
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Đang xoá…" : "Xoá"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
