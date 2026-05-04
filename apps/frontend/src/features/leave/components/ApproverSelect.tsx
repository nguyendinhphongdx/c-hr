"use client";

import { Loader2 } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApproverCandidates } from "@/features/orgchart";
import type { ID } from "@/lib/types";

interface ApproverSelectProps {
  employeeId: ID | null;
  value: ID | "";
  onChange: (value: ID) => void;
  disabled?: boolean;
}

/**
 * Dropdown of valid approvers for `employeeId` (manager chain ∪ HRM
 * appadmins). Default = `suggested` (nearest manager). User can pick
 * any candidate; BE re-validates on submit.
 */
export function ApproverSelect({
  employeeId,
  value,
  onChange,
  disabled,
}: ApproverSelectProps) {
  const { data, isLoading } = useApproverCandidates(employeeId);

  if (!employeeId) {
    return (
      <p className="text-sm text-muted-foreground">
        Tài khoản chưa gắn Employee — không thể chọn người duyệt.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải danh sách...
      </div>
    );
  }

  const candidates = data?.candidates ?? [];

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-rose-700">
        Không có người duyệt nào — liên hệ admin để cấu hình quản lý phòng
        hoặc HRM appadmin.
      </p>
    );
  }

  return (
    <Select
      value={value || undefined}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="Chọn người duyệt" />
      </SelectTrigger>
      <SelectContent>
        {candidates.map((c) => {
          if (!c.employeeId) return null;
          const isSuggested = data?.suggested?.employeeId === c.employeeId;
          return (
            <SelectItem key={c.employeeId} value={c.employeeId}>
              {c.name ?? c.email}
              {isSuggested ? " (đề xuất)" : ""}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
