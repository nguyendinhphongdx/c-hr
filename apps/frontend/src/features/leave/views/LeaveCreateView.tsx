"use client";

import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth";
import { useApproverCandidates } from "@/features/orgchart";

import { ApproverSelect } from "../components/ApproverSelect";
import { useCreateLeaveRequest } from "../hooks/useLeaveRequests";
import type { LeaveType } from "../types";

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "ANNUAL", label: "Nghỉ phép năm" },
  { value: "SICK", label: "Nghỉ ốm" },
  { value: "UNPAID", label: "Nghỉ không lương" },
  { value: "MATERNITY", label: "Nghỉ thai sản" },
  { value: "OTHER", label: "Khác" },
];

export function LeaveCreateView() {
  const router = useRouter();
  const { user } = useAuth();
  const employeeId = user?.employeeId ?? null;

  const candidates = useApproverCandidates(employeeId);
  const create = useCreateLeaveRequest();

  const [type, setType] = useState<LeaveType>("ANNUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [approverId, setApproverId] = useState("");
  const [reason, setReason] = useState("");
  // Default approver = suggested (nearest manager) once candidates load.
  // Set during render (not in an effect) — once approverId is non-empty
  // the condition stops firing, so this is a one-shot init.
  if (!approverId && candidates.data?.suggested?.employeeId) {
    setApproverId(candidates.data.suggested.employeeId);
  }

  if (!employeeId) {
    return (
      <p className="text-sm text-muted-foreground">
        Tài khoản chưa gắn Employee — không thể tạo đơn nghỉ.
      </p>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error("Chọn ngày bắt đầu và kết thúc");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      toast.error("Ngày kết thúc phải sau ngày bắt đầu");
      return;
    }
    if (!approverId) {
      toast.error("Chọn người duyệt");
      return;
    }

    try {
      const created = await create.mutateAsync({
        type,
        startDate,
        endDate,
        approverId,
        reason: reason.trim() || undefined,
      });
      toast.success("Đã gửi đơn — chờ duyệt");
      router.push(`/leave/${created.id}`);
    } catch (err) {
      toast.error("Tạo đơn thất bại — kiểm tra lại");
      console.error(err);
    }
  };

  const submitting = create.isPending;

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Tạo đơn xin nghỉ</CardTitle>
        <CardDescription>
          Người duyệt mặc định là quản lý gần nhất từ orgchart — bạn có thể đổi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="type">Loại</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as LeaveType)}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Từ ngày</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">Đến ngày</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="approver">Người duyệt</Label>
            <ApproverSelect
              employeeId={employeeId}
              value={approverId}
              onChange={setApproverId}
              disabled={submitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reason">Lý do (tuỳ chọn)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Gửi đơn
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
