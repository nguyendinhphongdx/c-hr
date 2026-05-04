"use client";

import { Loader2, Save } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth";
import { ApproverSelect } from "@/features/leave";
import { useApproverCandidates } from "@/features/orgchart";

import { useCreateCorrection } from "../hooks/useCorrections";

/**
 * Form to file an attendance-correction request. Pre-fills `date` from
 * the `?date=YYYY-MM-DD` query param so the timesheet's "Tạo đơn quên
 * chấm" button can drop the user here with the right cell selected.
 */
export function CorrectionCreateView() {
  const router = useRouter();
  const search = useSearchParams();
  const { user } = useAuth();
  const employeeId = user?.employeeId ?? null;

  const candidates = useApproverCandidates(employeeId);
  const create = useCreateCorrection();

  const initialDate = search.get("date") ?? "";

  const [date, setDate] = useState(initialDate);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [reason, setReason] = useState("");
  const [approverId, setApproverId] = useState("");
  // One-shot init of suggested approver — set during render (not in an
  // effect) to satisfy react-hooks/set-state-in-effect.
  if (!approverId && candidates.data?.suggested?.employeeId) {
    setApproverId(candidates.data.suggested.employeeId);
  }

  if (!employeeId) {
    return (
      <p className="text-sm text-muted-foreground">
        Tài khoản chưa gắn Employee — không thể tạo đơn quên chấm.
      </p>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast.error("Chọn ngày cần điều chỉnh");
      return;
    }
    if (!checkIn && !checkOut) {
      toast.error("Nhập giờ vào hoặc giờ ra (ít nhất 1)");
      return;
    }
    if (!reason.trim()) {
      toast.error("Nhập lý do");
      return;
    }
    if (!approverId) {
      toast.error("Chọn người duyệt");
      return;
    }

    try {
      const payload = {
        date,
        requestedCheckInAt: checkIn ? toIsoDateTime(date, checkIn) : undefined,
        requestedCheckOutAt: checkOut ? toIsoDateTime(date, checkOut) : undefined,
        reason: reason.trim(),
        approverId,
      };
      const created = await create.mutateAsync(payload);
      toast.success("Đã gửi đơn — chờ duyệt");
      router.push(`/attendance-corrections/${created.id}`);
    } catch (err) {
      toast.error("Tạo đơn thất bại");
      console.error(err);
    }
  };

  const submitting = create.isPending;

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Đơn quên chấm công</CardTitle>
        <CardDescription>
          Khi quên chấm hoặc máy chấm sai. Sau khi duyệt, log chấm công
          được tạo/sửa với nguồn `CORRECTION`.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="date">Ngày</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="checkIn">Giờ vào</Label>
              <Input
                id="checkIn"
                type="time"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="checkOut">Giờ ra</Label>
              <Input
                id="checkOut"
                type="time"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reason">Lý do</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              required
            />
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

/** Combine a YYYY-MM-DD date and HH:MM time into ISO 8601 (local timezone). */
function toIsoDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}
