"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Eye, EyeOff, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/features/auth";
import { RichTextDescriptionField } from "@/features/calendar/components/event/RichTextDescriptionField";
import { TagPicker } from "@/features/tags";
import { UserPicker } from "@/features/users/components/UserPicker";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

import {
  useCreateTask,
  useDeleteTask,
  useTask,
  useUnwatchTask,
  useUpdateTask,
  useWatchTask,
} from "../../hooks/useTasks";
import { useProjectMembers } from "../../hooks/useProjects";
import type {
  TaskDetail,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from "../../types";
import { TaskAssigneeAvatar } from "./TaskAssigneeAvatar";
import { TaskStatusBadge } from "./TaskStatusBadge";

interface TaskDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  idOrCode: string | null;
  projectId: ID;
}

const STATUS_OPTIONS: TaskStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "REVIEW",
  "DONE",
  "CANCELLED",
];

const PRIORITY_OPTIONS: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export function TaskDetailDrawer({
  open,
  onClose,
  idOrCode,
  projectId,
}: TaskDetailDrawerProps) {
  const { user } = useAuth();
  const { data: task, isLoading, error } = useTask(open ? idOrCode : null);
  const members = useProjectMembers(projectId);
  const memberUserIds = (members.data ?? []).map((m) => m.userId);

  const update = useUpdateTask();
  const del = useDeleteTask();
  const watch = useWatchTask();
  const unwatch = useUnwatchTask();
  const createTask = useCreateTask();

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
            memberUserIds={memberUserIds}
            onSave={async (data) => {
              await update.mutateAsync({ id: task.id, data });
            }}
            onDelete={async () => {
              if (!confirm("Xoá task này?")) return;
              try {
                await del.mutateAsync(task.id);
                toast.success("Đã xoá task");
                onClose();
              } catch (err) {
                toast.error("Không xoá được", {
                  description:
                    err instanceof Error ? err.message : "Vui lòng thử lại.",
                });
              }
            }}
            onWatchToggle={async (isWatching) => {
              try {
                if (isWatching) {
                  await unwatch.mutateAsync(task.id);
                } else {
                  await watch.mutateAsync(task.id);
                }
              } catch (err) {
                toast.error("Không cập nhật được", {
                  description:
                    err instanceof Error ? err.message : "Vui lòng thử lại.",
                });
              }
            }}
            onAddSubtask={async (title) => {
              try {
                await createTask.mutateAsync({
                  projectId: task.projectId,
                  title,
                  parentTaskId: task.id,
                });
                toast.success("Đã tạo subtask");
              } catch (err) {
                toast.error("Không tạo được subtask", {
                  description:
                    err instanceof Error ? err.message : "Vui lòng thử lại.",
                });
              }
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface BodyProps {
  task: TaskDetail;
  currentUserId: string | undefined;
  memberUserIds: ID[];
  onSave: (data: UpdateTaskInput) => Promise<void>;
  onDelete: () => Promise<void>;
  onWatchToggle: (isWatching: boolean) => Promise<void>;
  onAddSubtask: (title: string) => Promise<void>;
}

function TaskDetailBody({
  task,
  currentUserId,
  memberUserIds,
  onSave,
  onDelete,
  onWatchToggle,
  onAddSubtask,
}: BodyProps) {
  const [title, setTitle] = useState(task.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [description, setDescription] = useState(task.description ?? "");
  const [editingDescription, setEditingDescription] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setEditingTitle(false);
    setEditingDescription(false);
  }, [task.id, task.updatedAt, task.title, task.description]);

  const isWatching = useMemo(
    () => !!currentUserId && task.watchers.some((w) => w.userId === currentUserId),
    [currentUserId, task.watchers],
  );

  const tagIds = useMemo(() => task.tags.map((t) => t.id), [task.tags]);

  const saveField = async (data: UpdateTaskInput) => {
    try {
      await onSave(data);
    } catch (err) {
      toast.error("Không lưu được", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
    }
  };

  const canEdit = task.view.canEdit;
  const canDelete = task.view.canDelete;

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b px-6 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{task.code}</span>
          <span>·</span>
          <Select
            value={task.status}
            onValueChange={(v) =>
              canEdit && v !== task.status
                ? saveField({ status: v as TaskStatus })
                : undefined
            }
            disabled={!canEdit}
          >
            <SelectTrigger className="h-7 w-[160px] text-xs">
              <SelectValue>
                <TaskStatusBadge status={task.status} size="sm" />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  <TaskStatusBadge status={s} size="sm" />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <SheetTitle className="sr-only">{task.title}</SheetTitle>
        <SheetDescription className="sr-only">
          Chi tiết task {task.code}
        </SheetDescription>

        <div className="mt-2 pr-10">
          {editingTitle && canEdit ? (
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                setEditingTitle(false);
                if (title.trim() && title !== task.title) {
                  saveField({ title: title.trim() });
                } else {
                  setTitle(task.title);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
                if (e.key === "Escape") {
                  setTitle(task.title);
                  setEditingTitle(false);
                }
              }}
              className="text-lg font-semibold"
            />
          ) : (
            <h2
              className={cn(
                "text-lg font-semibold leading-snug",
                canEdit &&
                  "cursor-text rounded-sm px-1 -mx-1 hover:bg-accent/40",
              )}
              onClick={() => canEdit && setEditingTitle(true)}
            >
              {task.title}
            </h2>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <section>
          <SectionHeader>Thông tin</SectionHeader>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <MetaItem label="Người làm">
              <UserPicker
                value={task.assignee?.id ?? null}
                onChange={(u) =>
                  canEdit ? saveField({ assigneeId: u?.id ?? null }) : undefined
                }
                disabled={!canEdit}
                fallback={
                  task.assignee
                    ? { name: task.assignee.name, email: task.assignee.email }
                    : null
                }
                filter={(u) =>
                  memberUserIds.length === 0 || memberUserIds.includes(u.id)
                }
                placeholder="Chưa giao"
              />
            </MetaItem>
            <MetaItem label="Người tạo">
              <div className="flex items-center gap-2">
                <TaskAssigneeAvatar user={task.reporter} />
                <span className="text-xs">
                  {task.reporter.name ?? task.reporter.email}
                </span>
              </div>
            </MetaItem>
            <MetaItem label="Độ ưu tiên">
              <Select
                value={task.priority}
                onValueChange={(v) =>
                  canEdit && v !== task.priority
                    ? saveField({ priority: v as TaskPriority })
                    : undefined
                }
                disabled={!canEdit}
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {priorityLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </MetaItem>
            <MetaItem label="Hạn chót">
              <Input
                type="date"
                value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                disabled={!canEdit}
                onChange={(e) =>
                  saveField({ dueDate: e.target.value || null })
                }
                className="h-8"
              />
            </MetaItem>
          </div>
        </section>

        <section>
          <SectionHeader>Tag</SectionHeader>
          <TagPicker
            value={tagIds}
            onChange={(ids) => saveField({ tagIds: ids })}
            scope="null"
            fallbackTags={task.tags}
            disabled={!canEdit}
          />
        </section>

        <section>
          <SectionHeader>Mô tả</SectionHeader>
          {editingDescription && canEdit ? (
            <div className="space-y-2">
              <RichTextDescriptionField
                value={description}
                onChange={setDescription}
                placeholder="Mô tả task…"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDescription(task.description ?? "");
                    setEditingDescription(false);
                  }}
                >
                  Huỷ
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={async () => {
                    await saveField({ description: description || null });
                    setEditingDescription(false);
                  }}
                >
                  Lưu
                </Button>
              </div>
            </div>
          ) : task.description ? (
            <div
              className={cn(
                "prose prose-sm dark:prose-invert max-w-none",
                canEdit && "cursor-text rounded-sm hover:bg-accent/30",
              )}
              onClick={() => canEdit && setEditingDescription(true)}
              dangerouslySetInnerHTML={{ __html: task.description }}
            />
          ) : (
            <button
              type="button"
              onClick={() => canEdit && setEditingDescription(true)}
              disabled={!canEdit}
              className="text-xs text-muted-foreground hover:text-foreground disabled:cursor-default"
            >
              {canEdit ? "+ Thêm mô tả" : "Chưa có mô tả"}
            </button>
          )}
        </section>

        <section>
          <SectionHeader>Subtask ({task.subtasks.length})</SectionHeader>
          <ul className="space-y-1.5">
            {task.subtasks.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm"
              >
                <span className="font-mono text-[11px] text-muted-foreground">
                  {s.code}
                </span>
                <span className="flex-1 truncate">{s.title}</span>
                <TaskStatusBadge status={s.status} size="sm" />
              </li>
            ))}
          </ul>
          {canEdit && (
            <div className="mt-2 flex items-center gap-2">
              <Input
                placeholder="Tên subtask…"
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && subtaskTitle.trim()) {
                    e.preventDefault();
                    await onAddSubtask(subtaskTitle.trim());
                    setSubtaskTitle("");
                  }
                }}
                className="h-8"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!subtaskTitle.trim()}
                onClick={async () => {
                  await onAddSubtask(subtaskTitle.trim());
                  setSubtaskTitle("");
                }}
              >
                <Plus className="mr-1 h-3 w-3" /> Thêm
              </Button>
            </div>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Người theo dõi ({task.watchers.length})
            </h4>
            {currentUserId && (
              <Button
                type="button"
                size="sm"
                variant={isWatching ? "outline" : "default"}
                onClick={() => onWatchToggle(isWatching)}
              >
                {isWatching ? (
                  <>
                    <EyeOff className="mr-1 h-3.5 w-3.5" /> Bỏ theo dõi
                  </>
                ) : (
                  <>
                    <Eye className="mr-1 h-3.5 w-3.5" /> Theo dõi
                  </>
                )}
              </Button>
            )}
          </div>
          <ul className="flex flex-wrap gap-2">
            {task.watchers.map((w) => (
              <li key={w.id} className="flex items-center gap-1.5 rounded-full bg-muted/40 px-2 py-1 text-xs">
                <TaskAssigneeAvatar user={w.user} />
                <span>{w.user.name ?? w.user.email}</span>
              </li>
            ))}
            {task.watchers.length === 0 && (
              <li className="text-xs text-muted-foreground">
                Chưa có ai theo dõi.
              </li>
            )}
          </ul>
        </section>

        <section className="rounded border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground">
          Bình luận sẽ có ở Phase 4.
        </section>

        <section className="text-[11px] text-muted-foreground">
          Tạo lúc{" "}
          {format(new Date(task.createdAt), "HH:mm dd/MM/yyyy", { locale: vi })}
          {" · "}
          Cập nhật{" "}
          {format(new Date(task.updatedAt), "HH:mm dd/MM/yyyy", { locale: vi })}
        </section>
      </div>

      {canDelete && (
        <footer className="flex shrink-0 items-center justify-between border-t bg-background px-6 py-3">
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Xoá
          </Button>
        </footer>
      )}
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

function priorityLabel(p: TaskPriority): string {
  switch (p) {
    case "LOW":
      return "Thấp";
    case "MEDIUM":
      return "Trung bình";
    case "HIGH":
      return "Cao";
    case "URGENT":
      return "Khẩn";
  }
}
