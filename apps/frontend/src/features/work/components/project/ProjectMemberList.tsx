"use client";

import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPicker, type OrgUser } from "@/features/users";
import type { ID } from "@/lib/types";

import {
  useAddMember,
  useProjectMembers,
  useRemoveMember,
  useUpdateMemberRole,
} from "../../hooks/useProjects";
import type { ProjectRole } from "../../types";

const ROLE_OPTIONS: { value: ProjectRole; label: string }[] = [
  { value: "OWNER", label: "Quản trị (Owner)" },
  { value: "EDITOR", label: "Chỉnh sửa" },
  { value: "COMMENTER", label: "Bình luận" },
  { value: "VIEWER", label: "Xem" },
];

interface ProjectMemberListProps {
  projectId: ID;
  /** Whether the current user can manage members. */
  canManage: boolean;
}

export function ProjectMemberList({
  projectId,
  canManage,
}: ProjectMemberListProps) {
  const { data: members, isLoading } = useProjectMembers(projectId);
  const addMut = useAddMember();
  const updateMut = useUpdateMemberRole();
  const removeMut = useRemoveMember();

  const onAdd = async (u: OrgUser | null) => {
    if (!u) return;
    if (members?.some((m) => m.userId === u.id)) {
      toast.info("Người này đã là thành viên");
      return;
    }
    try {
      await addMut.mutateAsync({
        projectId,
        data: { userId: u.id, role: "EDITOR" },
      });
      toast.success("Đã thêm thành viên");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi thêm thành viên");
    }
  };

  const onUpdateRole = async (userId: ID, role: ProjectRole) => {
    try {
      await updateMut.mutateAsync({ projectId, userId, data: { role } });
      toast.success("Đã cập nhật vai trò");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi cập nhật");
    }
  };

  const onRemove = async (userId: ID) => {
    try {
      await removeMut.mutateAsync({ projectId, userId });
      toast.success("Đã xoá thành viên");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi xoá");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <UserPicker
          value={null}
          onChange={onAdd}
          placeholder="Thêm thành viên..."
        />
      )}

      <ul className="space-y-1">
        {(members ?? []).map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-3 rounded-md border bg-card px-3 py-2"
          >
            <Avatar className="h-8 w-8">
              {m.user.avatar && (
                <AvatarImage
                  src={m.user.avatar}
                  alt={m.user.name ?? m.user.email}
                />
              )}
              <AvatarFallback className="text-xs">
                {avatarInitials(m.user.name, m.user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {m.user.name ?? "(không tên)"}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {m.user.email}
              </div>
            </div>
            <div className="w-40">
              <Select
                value={m.role}
                onValueChange={(v) => onUpdateRole(m.userId, v as ProjectRole)}
                disabled={!canManage}
              >
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canManage && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(m.userId)}
                aria-label={`Xoá ${m.user.name ?? m.user.email}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function avatarInitials(name: string | null, email: string): string {
  const source = name && name.trim() ? name : email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}
