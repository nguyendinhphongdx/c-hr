"use client";

import { format } from "date-fns";
import { Check, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth";
import type { ID } from "@/lib/types";

import {
  useApproveRequest,
  useCancelRequest,
  useRejectRequest,
} from "../hooks/useRequests";
import type { RequestRow } from "../types";

import { DynamicDataView } from "./DynamicDataView";
import { StatusBadge } from "./StatusBadge";

/**
 * Right-side panel of the master-detail layout. Shows the selected
 * request's metadata + data fields + decision actions if the user is
 * the assigned approver or requester. The list view mounts this once
 * and feeds it the selected row.
 */
export function RequestPreview({ request }: { request: RequestRow | null }) {
  const { user } = useAuth();
  const employeeId = user?.employeeId ?? null;

  const approve = useApproveRequest();
  const reject = useRejectRequest();
  const cancel = useCancelRequest();

  const [rejectNote, setRejectNote] = useState("");
  const [showReject, setShowReject] = useState(false);

  if (!request) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Chọn một đơn ở danh sách bên trái để xem chi tiết.
      </div>
    );
  }

  const isApprover = employeeId === request.approverId;
  const isRequester = employeeId === request.requesterId;
  const canDecide = isApprover && request.status === "PENDING";
  const canCancel = isRequester && request.status === "PENDING";

  const onApprove = async () => {
    try {
      await approve.mutateAsync({ id: request.id });
      toast.success(
        request.group.code === "leave"
          ? "Đã duyệt đơn"
          : "Đã duyệt — log chấm công đã cập nhật",
      );
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
      await reject.mutateAsync({
        id: request.id,
        data: { decisionNote: rejectNote },
      });
      toast.success("Đã từ chối đơn");
      setShowReject(false);
      setRejectNote("");
    } catch (err) {
      toast.error("Không từ chối được");
      console.error(err);
    }
  };

  const onCancel = async () => {
    try {
      await cancel.mutateAsync(request.id);
      toast.success("Đã huỷ đơn");
    } catch (err) {
      toast.error("Không huỷ được");
      console.error(err);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">{request.group.name}</h3>
          <p className="text-xs text-muted-foreground">
            Tạo {format(new Date(request.createdAt), "dd/MM/yyyy HH:mm")}
          </p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="grid gap-3 border-y py-3">
        <Field
          label="Người gửi"
          value={request.requester.user?.name ?? request.requester.user?.email ?? request.requester.code}
        />
        <Field
          label="Người duyệt"
          value={
            request.approver?.user?.name ??
            request.approver?.user?.email ??
            request.approver?.code ??
            "—"
          }
        />
      </div>

      <DynamicDataView schema={request.group.fieldsSchema} data={request.data} />

      {(request.decisionNote || request.decidedAt) && (
        <div className="grid gap-3 border-t pt-3">
          {request.decisionNote && (
            <Field label="Ghi chú quyết định" value={request.decisionNote} />
          )}
          {request.decidedAt && (
            <Field
              label="Quyết định lúc"
              value={format(new Date(request.decidedAt), "dd/MM/yyyy HH:mm")}
            />
          )}
        </div>
      )}

      {(canDecide || canCancel) && (
        <div className="border-t pt-4">
          {canDecide && !showReject && (
            <div className="flex flex-wrap gap-2">
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
            </div>
          )}

          {canDecide && showReject && (
            <RejectForm
              note={rejectNote}
              setNote={setRejectNote}
              onCancel={() => {
                setShowReject(false);
                setRejectNote("");
              }}
              onSubmit={onReject}
              submitting={reject.isPending}
              key={request.id}
            />
          )}

          {canCancel && (
            <Button
              variant="outline"
              className="mt-2"
              onClick={onCancel}
              disabled={cancel.isPending}
            >
              {cancel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Huỷ đơn
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function RejectForm({
  note,
  setNote,
  onCancel,
  onSubmit,
  submitting,
}: {
  note: string;
  setNote: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitting: boolean;
  /** New `key` from parent when the selected request changes — reset state. */
  key?: ID;
}) {
  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <Label htmlFor="rejectNote">Lý do từ chối</Label>
      <Textarea
        id="rejectNote"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        rows={3}
        required
      />
      <div className="flex gap-2">
        <Button variant="destructive" onClick={onSubmit} disabled={submitting}>
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <X className="mr-2 h-4 w-4" />
          )}
          Xác nhận từ chối
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Quay lại
        </Button>
      </div>
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
