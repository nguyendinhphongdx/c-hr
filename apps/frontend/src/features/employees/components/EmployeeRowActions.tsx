"use client";

import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ID } from "@/lib/types";

interface EmployeeRowActionsProps {
  id: ID;
  canManage: boolean;
  onView: (id: ID) => void;
  onEdit: (id: ID) => void;
  onDelete: (id: ID) => void;
}

export function EmployeeRowActions({
  id,
  canManage,
  onView,
  onEdit,
  onDelete,
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
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => onView(id)} className="gap-2">
          <Eye className="h-3.5 w-3.5" /> Xem chi tiết
        </DropdownMenuItem>
        {canManage && (
          <>
            <DropdownMenuItem onClick={() => onEdit(id)} className="gap-2">
              <Pencil className="h-3.5 w-3.5" /> Sửa
            </DropdownMenuItem>
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
