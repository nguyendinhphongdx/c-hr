"use client";

import {
  Building2,
  Car,
  Laptop,
  Loader2,
  Pencil,
  Plus,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { PageContainer } from "@/components/layout/PageContainer";
import { useIsAppAdmin } from "@/features/auth";

import { ResourceCreateDialog } from "../components/resource/ResourceCreateDialog";
import {
  useDeleteResource,
  useResources,
} from "../hooks/useResources";
import type { ResourceKind, ResourceRow } from "../types";

const KIND_ICON: Record<ResourceKind, typeof Building2> = {
  ROOM: Building2,
  EQUIPMENT: Laptop,
  VEHICLE: Car,
};

const KIND_LABEL: Record<ResourceKind, string> = {
  ROOM: "Phòng họp",
  EQUIPMENT: "Thiết bị",
  VEHICLE: "Xe",
};

/**
 * HRM-admin-only catalog of bookable resources. List + create/edit
 * dialogs + soft-delete (FK Restrict — caller must cancel bookings to
 * actually free a resource).
 */
export function ResourcesAdminView() {
  const isHrmAdmin = useIsAppAdmin("HRM");

  if (!isHrmAdmin) {
    return (
      <PageContainer>
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldOff />
            </EmptyMedia>
            <EmptyTitle>Không có quyền truy cập</EmptyTitle>
            <EmptyDescription>
              Chỉ HRM admin xem được tài nguyên.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ResourcesAdminViewInner />
    </PageContainer>
  );
}

function ResourcesAdminViewInner() {
  const list = useResources({});
  const remove = useDeleteResource();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceRow | null>(null);

  const onDelete = async (r: ResourceRow) => {
    if (!confirm(`Vô hiệu hoá "${r.name}"? Booking đã có vẫn giữ nguyên.`)) {
      return;
    }
    try {
      await remove.mutateAsync(r.id);
      toast.success("Đã vô hiệu hoá");
    } catch (err) {
      toast.error("Không xoá được", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Tài nguyên</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Phòng họp, thiết bị, xe — sẽ hiện trong picker khi tạo sự kiện.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Thêm tài nguyên
        </Button>
      </div>

      <div className="rounded-md border bg-background">
        {list.isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
          </div>
        ) : list.error ? (
          <p className="p-6 text-sm text-destructive">
            Không tải được danh sách tài nguyên.
          </p>
        ) : !list.data?.length ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Chưa có tài nguyên nào — bấm &quot;Thêm tài nguyên&quot; để tạo.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Loại</th>
                <th className="px-4 py-3 font-medium">Tên</th>
                <th className="px-4 py-3 font-medium">Vị trí</th>
                <th className="px-4 py-3 font-medium">Sức chứa</th>
                <th className="px-4 py-3 font-medium">Phòng ban quản lý</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.data.map((r) => {
                const Icon = KIND_ICON[r.kind];
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                        {KIND_LABEL[r.kind]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.location ?? "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {r.capacity ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.managingDepartment?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={r.isActive ? "default" : "outline"}>
                        {r.isActive ? "Đang dùng" : "Đã vô hiệu"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(r)}
                          title="Sửa"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDelete(r)}
                          title="Vô hiệu hoá"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ResourceCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <ResourceCreateDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        editing={editing}
      />
    </div>
  );
}
