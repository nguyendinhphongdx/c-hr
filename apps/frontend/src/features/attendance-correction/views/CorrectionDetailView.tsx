"use client";

import { format } from "date-fns";
import { Check, Loader2, X } from "lucide-react";
import Link from "next/link";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth";
import { LeaveStatusBadge } from "@/features/leave";
import type { ID } from "@/lib/types";

import {
  useApproveCorrection,
  useCancelCorrection,
  useCorrection,
  useRejectCorrection,
} from "../hooks/useCorrections";

export function CorrectionDetailView({ id }: { id: ID }) {
  const { user } = useAuth();
  const employeeId = user?.employeeId ?? null;
  const { data: req, isLoading } = useCorrection(id);

  const approve = useApproveCorrection();
  const reject = useRejectCorrection();
  const cancel = useCancelCorrection();

  const [rejectNote, setRejectNote] = useState("");
  const [showReject, setShowReject] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải đơn...
      </div>
    );
  }

  if (!req) {
    return (
      <p className="text-sm text-rose-700">
        Không tìm thấy đơn này hoặc bạn không có quyền xem.
      </p>
    );
  }

  const isApprover = employeeId === req.approverId;
  const isRequester = employeeId === req.requesterId;
  const canDecide = isApprover && req.status === "PENDING";
  const canCancel = isRequester && req.status === "PENDING";

  const onApprove = async () => {
    try {
      await approve.mutateAsync({ id });
      toast.success("Đã duyệt — log chấm công đã cập nhật");
    } catch (err) {
      toast.error("Không duyệt được");
      console.error(err);
    }
  };

  const onReject = async () => {
    if (!rejectNote.trim()) {
      toast.error("Nhập lý do từ chối");
      return;
    }
    try {
      await reject.mutateAsync({ id, data: { decisionNote: rejectNote } });
      toast.success("Đã từ chối đơn");
      setShowReject(false);
    } catch (err) {
      toast.error("Không từ chối được");
      console.error(err);
    }
  };

  const onCancel = async () => {
    try {
      await cancel.mutateAsync(id);
      toast.success("Đã huỷ đơn");
    } catch (err) {
      toast.error("Không huỷ được");
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link href="/attendance-corrections">← Danh sách đơn</Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>
                Đơn quên chấm — {format(new Date(req.date), "dd/MM/yyyy")}
              </CardTitle>
              <CardDescription>
                Tạo lúc {format(new Date(req.createdAt), "dd/MM/yyyy HH:mm")}
              </CardDescription>
            </div>
            <LeaveStatusBadge status={req.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label="Người gửi"
            value={
              req.requester.user?.name ??
              req.requester.user?.email ??
              req.requester.code
            }
          />
          <Field
            label="Người duyệt"
            value={
              req.approver?.user?.name ??
              req.approver?.user?.email ??
              req.approver?.code ??
              "—"
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Giờ vào đề xuất"
              value={
                req.requestedCheckInAt
                  ? format(new Date(req.requestedCheckInAt), "HH:mm")
                  : "—"
              }
            />
            <Field
              label="Giờ ra đề xuất"
              value={
                req.requestedCheckOutAt
                  ? format(new Date(req.requestedCheckOutAt), "HH:mm")
                  : "—"
              }
            />
          </div>
          <Field label="Lý do" value={req.reason} />
          {req.decisionNote && (
            <Field label="Ghi chú quyết định" value={req.decisionNote} />
          )}
          {req.decidedAt && (
            <Field
              label="Quyết định lúc"
              value={format(new Date(req.decidedAt), "dd/MM/yyyy HH:mm")}
            />
          )}

          <div className="flex flex-wrap gap-2 border-t pt-4">
            {canDecide && !showReject && (
              <>
                <Button onClick={onApprove} disabled={approve.isPending}>
                  {approve.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Duyệt
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowReject(true)}
                  disabled={reject.isPending}
                >
                  <X className="mr-2 h-4 w-4" />
                  Từ chối
                </Button>
              </>
            )}
            {canCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={cancel.isPending}
              >
                {cancel.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Huỷ đơn
              </Button>
            )}
          </div>

          {canDecide && showReject && (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <Label htmlFor="rejectNote">Lý do từ chối</Label>
              <Textarea
                id="rejectNote"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                maxLength={500}
                rows={3}
                required
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={onReject}
                  disabled={reject.isPending}
                >
                  {reject.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <X className="mr-2 h-4 w-4" />
                  )}
                  Xác nhận từ chối
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReject(false);
                    setRejectNote("");
                  }}
                >
                  Quay lại
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm">{value}</div>
    </div>
  );
}
