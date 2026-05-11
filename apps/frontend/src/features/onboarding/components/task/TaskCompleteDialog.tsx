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

import { useCompleteTask } from "../../hooks/useOnboardingTasks";
import type { OnboardingTaskRow } from "../../types";

interface TaskCompleteDialogProps {
  task: OnboardingTaskRow | null;
  open: boolean;
  onClose: () => void;
}

export function TaskCompleteDialog(props: TaskCompleteDialogProps) {
  // Remount the body each time the dialog re-opens so internal form state
  // resets without needing a setState-in-effect dance.
  return (
    <TaskCompleteDialogInner
      key={props.open ? `open-${props.task?.id ?? ""}` : "closed"}
      {...props}
    />
  );
}

function TaskCompleteDialogInner({
  task,
  open,
  onClose,
}: TaskCompleteDialogProps) {
  const completeMut = useCompleteTask();
  const [note, setNote] = useState("");

  if (!task) return null;

  const onSubmit = async () => {
    try {
      await completeMut.mutateAsync({
        id: task.id,
        data: note.trim() ? { note: note.trim() } : {},
      });
      toast.success("Đã hoàn thành nhiệm vụ");
      onClose();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ??
        (err instanceof Error ? err.message : "Không hoàn thành được");
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Hoàn thành nhiệm vụ</DialogTitle>
          <DialogDescription>
            Đánh dấu &ldquo;{task.title}&rdquo; là hoàn thành?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="complete-note" className="text-xs">
            Ghi chú (tuỳ chọn)
          </Label>
          <Textarea
            id="complete-note"
            rows={3}
            placeholder="Ghi chú thêm (tuỳ chọn)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={completeMut.isPending}
          >
            {completeMut.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Hoàn thành
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
