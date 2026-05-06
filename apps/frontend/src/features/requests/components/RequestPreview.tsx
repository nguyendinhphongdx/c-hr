"use client";

import { format } from "date-fns";
import { Check, Copy, Loader2, Pencil, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth";
import {
  ApprovalFlow,
  CommentEditor,
  UnifiedTimeline,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from "@/features/collaboration";
import { encodeObjectRef } from "@/lib/object-ref";
import type { ID } from "@/lib/types";

import {
  useApproveRequest,
  useCancelRequest,
  useRejectRequest,
} from "../hooks/useRequests";
import type { RequestParticipant, RequestRow } from "../types";

import { DynamicDataView } from "./DynamicDataView";
import { EditRequestDialog } from "./EditRequestDialog";
import { RequestCreateDialog } from "./RequestCreateDialog";
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
  const [editOpen, setEditOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cloning, setCloning] = useState(false);

  const objectRef = request
    ? encodeObjectRef({ objectType: "Request", objectId: request.id })
    : "";
  const createComment = useCreateComment(objectRef);
  const updateComment = useUpdateComment(objectRef);
  const deleteComment = useDeleteComment(objectRef);

  if (!request) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Chọn một đơn ở danh sách để xem chi tiết.
      </div>
    );
  }

  const isApprover = employeeId === request.approverId;
  const isRequester = employeeId === request.requesterId;
  const canDecide = isApprover && request.status === "PENDING";
  const canCancel = isRequester && request.status === "PENDING";
  const canEdit = isRequester && request.status === "PENDING";
  const isDecided =
    request.status === "APPROVED" || request.status === "REJECTED";

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
      setConfirmCancelOpen(false);
    } catch (err) {
      toast.error("Không huỷ được");
      console.error(err);
    }
  };

  const shortId = request.id.slice(-8);
  const approverName = request.approver
    ? request.approver.user?.name ??
      request.approver.user?.email ??
      request.approver.code
    : null;

  return (
    <div className="flex h-full flex-col">
      {/* Sticky top header — title + status + approval flow */}
      <div className="sticky top-0 z-10 border-b bg-background px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-semibold">{request.group.name}</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span className="font-mono">#{shortId}</span>
              <span>·</span>
              <span>
                Tạo {format(new Date(request.createdAt), "dd/MM/yyyy HH:mm")}
              </span>
              {request.decidedAt && (
                <>
                  <span>·</span>
                  <span>
                    Quyết định{" "}
                    {format(new Date(request.decidedAt), "dd/MM/yyyy HH:mm")}
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Sửa
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCloning(true)}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Nhân bản
            </Button>
            <StatusBadge status={request.status} />
          </div>
        </div>
        <div className="mt-3">
          <ApprovalFlow
            requester={mapParty(request.requester)}
            approver={request.approver ? mapParty(request.approver) : null}
            status={request.status}
            size="md"
          />
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <DynamicDataView
          schema={request.group.fieldsSchema}
          data={request.data}
        />

        {isDecided && request.decidedAt && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p className="text-xs text-muted-foreground">
              {request.status === "APPROVED" ? "Đã duyệt" : "Đã từ chối"}
              {approverName ? ` bởi ${approverName}` : ""} ·{" "}
              {formatRelativeVi(request.decidedAt)}
            </p>
            {request.decisionNote && (
              <blockquote className="mt-2 border-l-2 border-border pl-3 text-sm text-foreground">
                {request.decisionNote}
              </blockquote>
            )}
          </div>
        )}

        <div className="border-t pt-3">
          <h4 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
            Hoạt động & bình luận
          </h4>
          <UnifiedTimeline
            objectRef={objectRef}
            currentUserId={user?.id}
            onUpdateComment={(id, data) =>
              updateComment.mutateAsync({ id, data }).then(() => undefined)
            }
            onDeleteComment={(id) =>
              deleteComment.mutateAsync(id).then(() => undefined)
            }
          />
        </div>

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
                onClick={() => setConfirmCancelOpen(true)}
                disabled={cancel.isPending}
              >
                {cancel.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Huỷ đơn
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Sticky bottom composer */}
      <div className="sticky bottom-0 border-t bg-background p-3">
        <CommentEditor
          onSubmit={async (bodyHtml, isInternal) => {
            await createComment.mutateAsync({ bodyHtml, isInternal });
          }}
          isInternalToggle
          placeholder="Viết bình luận…"
        />
      </div>

      {canEdit && (
        <EditRequestDialog
          request={request}
          requesterEmployeeId={employeeId}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}

      <RequestCreateDialog
        open={cloning}
        onClose={() => setCloning(false)}
        cloneFromId={request.id}
      />

      <AlertDialog
        open={confirmCancelOpen}
        onOpenChange={setConfirmCancelOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Huỷ đơn này?</AlertDialogTitle>
            <AlertDialogDescription>
              Huỷ đơn này? Không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancel.isPending}>
              Quay lại
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onCancel();
              }}
              disabled={cancel.isPending}
            >
              Xác nhận huỷ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function mapParty(p: RequestParticipant): { name: string; avatar: null } {
  return {
    name: p.user?.name ?? p.user?.email ?? p.code,
    avatar: null,
  };
}

function formatRelativeVi(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "vừa xong";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
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
