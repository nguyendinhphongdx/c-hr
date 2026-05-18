"use client";

import { useQueryClient } from "@tanstack/react-query";
import { format, isBefore, startOfDay } from "date-fns";
import { vi } from "date-fns/locale";
import {
  CheckCircle2,
  Loader2,
  Pencil,
  RotateCcw,
  Undo2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/features/auth";
import { RichTextDescriptionField } from "@/features/calendar/components/event/RichTextDescriptionField";
import {
  CommentComposer,
  UnifiedTimeline,
  useDeleteComment,
  useUpdateComment,
} from "@/features/collaboration";
import { ImageLightboxScope } from "@/components/shared/ImagePreview";
import { encodeObjectRef } from "@/lib/object-ref";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

import {
  onboardingTaskKeys,
  useOnboardingTask,
  useUncompleteTask,
  useUpdateTask,
} from "../../hooks/useOnboardingTasks";
import type { OnboardingTaskDetail } from "../../types";

interface TaskDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  taskId: ID | null;
  onRequestComplete: (task: OnboardingTaskDetail) => void;
  onRequestReassign: (task: OnboardingTaskDetail) => void;
}

export function TaskDetailDrawer({
  open,
  onClose,
  taskId,
  onRequestComplete,
  onRequestReassign,
}: TaskDetailDrawerProps) {
  const { user } = useAuth();
  const { data: task, isLoading, error } = useOnboardingTask(open ? taskId : null);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full !max-w-[640px] gap-0 overflow-hidden p-0"
      >
        {isLoading && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải…
          </div>
        )}
        {error && (
          <div className="flex h-full items-center justify-center px-6 text-sm text-destructive">
            Lỗi: {(error as Error).message}
          </div>
        )}
        {task && (
          <TaskDetailBody
            task={task}
            currentUserId={user?.id}
            onClose={onClose}
            onRequestComplete={() => onRequestComplete(task)}
            onRequestReassign={() => onRequestReassign(task)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface BodyProps {
  task: OnboardingTaskDetail;
  currentUserId: string | undefined;
  onClose: () => void;
  onRequestComplete: () => void;
  onRequestReassign: () => void;
}

function TaskDetailBody({
  task,
  currentUserId,
  onClose,
  onRequestComplete,
  onRequestReassign,
}: BodyProps) {
  // Remount the editable body when the task identity / version changes so
  // we don't need useEffect to reset title/description local state.
  return (
    <TaskDetailBodyInner
      key={`${task.id}:${task.updatedAt}`}
      task={task}
      currentUserId={currentUserId}
      onClose={onClose}
      onRequestComplete={onRequestComplete}
      onRequestReassign={onRequestReassign}
    />
  );
}

function TaskDetailBodyInner({
  task,
  currentUserId,
  onClose,
  onRequestComplete,
  onRequestReassign,
}: BodyProps) {
  const updateMut = useUpdateTask();
  const uncompleteMut = useUncompleteTask();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");

  const isDone = task.status === "DONE";
  const archived = task.plan.status === "ARCHIVED";
  const canEdit = task.view.canEdit;
  const canComplete = task.view.canComplete;
  const canReassign = task.view.canReassign;

  const overdue =
    !isDone &&
    task.dueDate != null &&
    isBefore(new Date(task.dueDate), startOfDay(new Date()));

  const handleSaveEdit = async () => {
    try {
      await updateMut.mutateAsync({
        id: task.id,
        data: {
          title: title.trim() || task.title,
          description: description || null,
        },
      });
      toast.success("Đã lưu");
      setEditing(false);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ??
        (err instanceof Error ? err.message : "Không lưu được");
      toast.error(msg);
    }
  };

  const handleUncomplete = async () => {
    try {
      await uncompleteMut.mutateAsync(task.id);
      toast.success("Đã đánh dấu chưa hoàn thành");
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ??
        (err instanceof Error ? err.message : "Không cập nhật được");
      toast.error(msg);
    }
  };

  const handleDueDate = async (value: string) => {
    try {
      await updateMut.mutateAsync({
        id: task.id,
        data: { dueDate: value || null },
      });
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ??
        (err instanceof Error ? err.message : "Không cập nhật được");
      toast.error(msg);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b px-6 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
              isDone
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                : "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
            )}
          >
            {isDone ? (
              <>
                <CheckCircle2 className="h-3 w-3" /> Hoàn thành
              </>
            ) : (
              "Chưa làm"
            )}
          </span>
          <span>·</span>
          <span>#{task.order}</span>
        </div>

        <SheetTitle className="sr-only">{task.title}</SheetTitle>
        <SheetDescription className="sr-only">
          Chi tiết nhiệm vụ onboarding
        </SheetDescription>

        <div className="mt-2 pr-10">
          {editing && canEdit ? (
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold"
            />
          ) : (
            <h2 className="text-lg font-semibold leading-snug">{task.title}</h2>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <section>
          <SectionHeader>Thông tin</SectionHeader>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <MetaItem label="Người nhận">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  {task.assignee?.avatar && (
                    <AvatarImage
                      src={task.assignee.avatar}
                      alt={task.assignee.name ?? task.assignee.email}
                    />
                  )}
                  <AvatarFallback className="text-[10px]">
                    {avatarInitials(task.assignee?.name, task.assignee?.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-xs">
                  {task.assignee?.name ?? task.assignee?.email ?? "Chưa giao"}
                </span>
              </div>
            </MetaItem>
            <MetaItem label="Hạn chót">
              <Input
                type="date"
                value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                disabled={!canEdit}
                onChange={(e) => handleDueDate(e.target.value)}
                className={cn(
                  "h-8",
                  overdue && "border-rose-300 text-rose-700",
                )}
              />
            </MetaItem>
            {task.completedAt && (
              <MetaItem label="Đã hoàn thành lúc">
                <span className="text-xs">
                  {format(new Date(task.completedAt), "HH:mm dd/MM/yyyy", {
                    locale: vi,
                  })}
                </span>
              </MetaItem>
            )}
            {task.completedNote && (
              <MetaItem label="Ghi chú hoàn thành">
                <span className="text-xs">{task.completedNote}</span>
              </MetaItem>
            )}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mô tả
            </h4>
            {canEdit && !editing && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
              >
                <Pencil className="mr-1 h-3 w-3" /> Sửa
              </Button>
            )}
          </div>
          {editing && canEdit ? (
            <div className="space-y-2">
              <RichTextDescriptionField
                value={description}
                onChange={setDescription}
                placeholder="Mô tả nhiệm vụ…"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTitle(task.title);
                    setDescription(task.description ?? "");
                    setEditing(false);
                  }}
                >
                  Huỷ
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={updateMut.isPending}
                >
                  {updateMut.isPending && (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  )}
                  Lưu
                </Button>
              </div>
            </div>
          ) : task.description ? (
            <ImageLightboxScope>
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: task.description }}
              />
            </ImageLightboxScope>
          ) : (
            <p className="text-xs text-muted-foreground">Chưa có mô tả.</p>
          )}
        </section>

        <section>
          <SectionHeader>Hoạt động & bình luận</SectionHeader>
          <TaskTimelineSection
            taskId={task.id}
            currentUserId={currentUserId}
          />
        </section>

        <section className="text-[11px] text-muted-foreground">
          Tạo lúc{" "}
          {format(new Date(task.createdAt), "HH:mm dd/MM/yyyy", { locale: vi })}
          {" · "}
          Cập nhật{" "}
          {format(new Date(task.updatedAt), "HH:mm dd/MM/yyyy", { locale: vi })}
        </section>
      </div>

      <TaskCommentComposer taskId={task.id} canComment={task.view.canView} />

      <footer className="flex shrink-0 items-center justify-between gap-2 border-t bg-background px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {!isDone && canComplete && (
            <Button type="button" size="sm" onClick={onRequestComplete}>
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Hoàn thành
            </Button>
          )}
          {isDone && canComplete && !archived && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleUncomplete}
              disabled={uncompleteMut.isPending}
            >
              {uncompleteMut.isPending ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Undo2 className="mr-1 h-3.5 w-3.5" />
              )}
              Hoàn tác
            </Button>
          )}
          {canReassign && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRequestReassign}
            >
              <Users className="mr-1 h-3.5 w-3.5" /> Giao lại
            </Button>
          )}
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Đóng
        </Button>
      </footer>
    </div>
  );
}

function TaskTimelineSection({
  taskId,
  currentUserId,
}: {
  taskId: ID;
  currentUserId: string | undefined;
}) {
  const objectRef = useMemo(
    () => encodeObjectRef({ objectType: "OnboardingTask", objectId: taskId }),
    [taskId],
  );
  const updateComment = useUpdateComment(objectRef);
  const deleteComment = useDeleteComment(objectRef);

  return (
    <UnifiedTimeline
      objectRef={objectRef}
      currentUserId={currentUserId}
      onUpdateComment={(id, data) =>
        updateComment.mutateAsync({ id, data }).then(() => undefined)
      }
      onDeleteComment={(id) =>
        deleteComment.mutateAsync(id).then(() => undefined)
      }
    />
  );
}

function TaskCommentComposer({
  taskId,
  canComment,
}: {
  taskId: ID;
  canComment: boolean;
}) {
  const qc = useQueryClient();
  const objectRef = useMemo(
    () => encodeObjectRef({ objectType: "OnboardingTask", objectId: taskId }),
    [taskId],
  );

  if (!canComment) return null;

  return (
    <div className="shrink-0 border-t bg-background px-6 py-3">
      <CommentComposer
        objectRef={objectRef}
        onCreated={() =>
          qc.invalidateQueries({
            queryKey: onboardingTaskKeys.detail(taskId),
          })
        }
      />
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h4>
  );
}

function MetaItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function avatarInitials(
  name: string | null | undefined,
  email?: string | null,
): string {
  const source = name && name.trim() ? name : email ?? "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}
