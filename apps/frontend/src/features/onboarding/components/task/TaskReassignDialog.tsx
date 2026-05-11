"use client";

import { Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserPicker } from "@/features/users";
import type { OrgUser } from "@/features/users";
import type { ID } from "@/lib/types";

import { useReassignTask } from "../../hooks/useOnboardingTasks";
import type { OnboardingTaskRow } from "../../types";

interface TaskReassignDialogProps {
  task: OnboardingTaskRow | null;
  open: boolean;
  onClose: () => void;
}

export function TaskReassignDialog(props: TaskReassignDialogProps) {
  return (
    <TaskReassignDialogInner
      key={props.open ? `open-${props.task?.id ?? ""}` : "closed"}
      {...props}
    />
  );
}

function TaskReassignDialogInner({
  task,
  open,
  onClose,
}: TaskReassignDialogProps) {
  const reassignMut = useReassignTask();
  const [userId, setUserId] = useState<ID | null>(task?.assigneeId ?? null);
  const [note, setNote] = useState("");

  if (!task) return null;

  const fallback: { name: string | null; email: string } | null = task.assignee
    ? { name: task.assignee.name, email: task.assignee.email }
    : null;

  const onSubmit = async () => {
    if (!userId) {
      toast.error("Chọn người nhận");
      return;
    }
    try {
      await reassignMut.mutateAsync({
        id: task.id,
        data: {
          assigneeUserId: userId,
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      });
      toast.success("Đã giao lại nhiệm vụ");
      onClose();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ??
        (err instanceof Error ? err.message : "Không giao lại được");
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Giao lại nhiệm vụ</DialogTitle>
          <DialogDescription>
            &ldquo;{task.title}&rdquo;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Người nhận mới</Label>
            <UserPicker
              value={userId}
              onChange={(u: OrgUser | null) => setUserId(u?.id ?? null)}
              fallback={fallback}
              placeholder="Chọn người nhận"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reassign-note" className="text-xs">
              Lý do (tuỳ chọn)
            </Label>
            <Textarea
              id="reassign-note"
              rows={3}
              placeholder="Vì sao giao lại?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={reassignMut.isPending || !userId}
          >
            {reassignMut.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Giao lại
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
