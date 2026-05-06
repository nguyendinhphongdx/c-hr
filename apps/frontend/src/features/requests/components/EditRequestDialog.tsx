"use client";

import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApproverCandidates } from "@/features/orgchart";

import { useUpdateRequest } from "../hooks/useRequests";
import type { RequestRow } from "../types";

import { DynamicForm } from "./DynamicForm";

interface EditRequestDialogProps {
  request: RequestRow;
  /** requester's employeeId — used to fetch approver candidates. */
  requesterEmployeeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditRequestDialog({
  request,
  requesterEmployeeId,
  open,
  onOpenChange,
}: EditRequestDialogProps) {
  const update = useUpdateRequest();
  const candidates = useApproverCandidates(requesterEmployeeId);

  const [data, setData] = useState<Record<string, unknown>>(request.data);
  const [title, setTitle] = useState<string>(request.title ?? "");
  const [approverId, setApproverId] = useState<string>(
    request.approverId ?? "",
  );
  // Re-sync local form state when the dialog (re)opens for a new request.
  // Render-time conditional init — see ADR react-hooks/set-state-in-effect.
  const [syncKey, setSyncKey] = useState<string>(`${request.id}:${open}`);
  const wantedKey = `${request.id}:${open}`;
  if (open && syncKey !== wantedKey) {
    setSyncKey(wantedKey);
    setData(request.data);
    setTitle(request.title ?? "");
    setApproverId(request.approverId ?? "");
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Nhập tiêu đề");
      return;
    }
    if (!approverId) {
      toast.error("Chọn người duyệt");
      return;
    }
    try {
      await update.mutateAsync({
        id: request.id,
        body: { title: title.trim(), data, approverId },
      });
      toast.success("Đã cập nhật đơn");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Cập nhật thất bại",
      );
      console.error(err);
    }
  };

  const submitting = update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sửa đơn — {request.group.name}</DialogTitle>
          <DialogDescription>
            Cập nhật nội dung và/hoặc đổi người duyệt. Chỉ áp dụng khi đơn còn
            ở trạng thái chờ duyệt.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-request-form"
          onSubmit={onSubmit}
          className="space-y-4 py-1"
        >
          <div className="grid gap-2">
            <Label htmlFor="edit-title">Tiêu đề</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Nghỉ phép tuần sau"
              maxLength={200}
              required
              disabled={submitting}
            />
          </div>

          <DynamicForm
            schema={request.group.fieldsSchema}
            value={data}
            onChange={setData}
            disabled={submitting}
          />

          <div className="grid gap-2">
            <Label htmlFor="edit-approver">Người duyệt</Label>
            <Select
              value={approverId || undefined}
              onValueChange={setApproverId}
              disabled={submitting}
            >
              <SelectTrigger id="edit-approver">
                <SelectValue placeholder="Chọn người duyệt..." />
              </SelectTrigger>
              <SelectContent>
                {(candidates.data?.candidates ?? []).map((c) => {
                  if (!c.employeeId) return null;
                  const isSuggested =
                    candidates.data?.suggested?.employeeId === c.employeeId;
                  return (
                    <SelectItem key={c.employeeId} value={c.employeeId}>
                      {c.name ?? c.email}
                      {isSuggested ? " (đề xuất)" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Huỷ
          </Button>
          <Button type="submit" form="edit-request-form" disabled={submitting}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
