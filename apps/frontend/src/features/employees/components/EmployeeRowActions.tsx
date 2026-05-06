"use client";

import { Eye, MoreHorizontal, Pencil, ShieldCheck, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ID } from "@/lib/types";

import type { Role } from "../types";

const ROLE_LABEL: Record<Role, string> = {
  sysowner: "Chủ hệ thống",
  admin: "Admin Org",
  user: "Nhân viên",
};

const ROLE_ORDER: Role[] = ["user", "admin", "sysowner"];

interface EmployeeRowActionsProps {
  id: ID;
  canManage: boolean;
  onView: (id: ID) => void;
  onEdit: (id: ID) => void;
  onDelete: (id: ID) => void;
  onChangeRole: (id: ID, role: Role) => void;
}

export function EmployeeRowActions({
  id,
  canManage,
  onView,
  onEdit,
  onDelete,
  onChangeRole,
}: EmployeeRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Mở menu"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onView(id)} className="gap-2">
          <Eye className="h-3.5 w-3.5" /> Xem chi tiết
        </DropdownMenuItem>
        {canManage && (
          <>
            <DropdownMenuItem onClick={() => onEdit(id)} className="gap-2">
              <Pencil className="h-3.5 w-3.5" /> Sửa
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2">
                <ShieldCheck className="h-3.5 w-3.5" /> Đổi vai trò
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {ROLE_ORDER.map((r) => (
                  <DropdownMenuItem
                    key={r}
                    onClick={() => onChangeRole(id, r)}
                  >
                    {ROLE_LABEL[r]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(id)}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Xoá
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
