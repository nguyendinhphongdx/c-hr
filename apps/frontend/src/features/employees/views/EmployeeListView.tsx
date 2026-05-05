"use client";

import { Loader2, Plus, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsAppAdmin } from "@/features/auth";
import type { ID } from "@/lib/types";

import { EmployeeCreateDialog } from "../components/EmployeeCreateDialog";
import { EmployeeDetailSheet } from "../components/EmployeeDetailSheet";
import { EmployeeEditDialog } from "../components/EmployeeEditDialog";
import { EmployeeRowActions } from "../components/EmployeeRowActions";
import { useDeleteEmployee, useEmployees } from "../hooks/useEmployees";
import type { EmployeeStatus } from "../types";

const PAGE_SIZE = 20;

const STATUSES: { value: EmployeeStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "ON_LEAVE", label: "On leave" },
  { value: "TERMINATED", label: "Terminated" },
];

const statusVariant: Record<EmployeeStatus, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  ON_LEAVE: "secondary",
  TERMINATED: "outline",
};

export function EmployeeListView() {
  const canManage = useIsAppAdmin("HRM");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<EmployeeStatus | "all">("all");
  const [page, setPage] = useState(1);

  const [viewingId, setViewingId] = useState<ID | null>(null);
  const [editingId, setEditingId] = useState<ID | null>(null);
  const [creating, setCreating] = useState(false);
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
    <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            HR records — search, filter, and (HRM admin) manage.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setCreating(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New employee
          </Button>
        )}
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or code"
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
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
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
            Loading employees…
          </div>
        ) : list.error ? (
          <p className="p-6 text-sm text-destructive">
            Couldn&apos;t load employees.
          </p>
        ) : !list.data?.data.length ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No employees match the current filters.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
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
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, list.data.total)} of {list.data.total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
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
              Next
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

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá nhân viên?</AlertDialogTitle>
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
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Đang xoá…" : "Xoá"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
