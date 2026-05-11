"use client";

import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Archive, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { RichTextDescriptionField } from "@/features/calendar/components/event/RichTextDescriptionField";
import type { ID } from "@/lib/types";

import {
  useAddTemplateTask,
  useArchiveTemplate,
  useDeleteTemplate,
  useReorderTemplateTasks,
  useTemplate,
  useUpdateTemplate,
} from "../../hooks/useOnboardingTemplates";
import type { OnboardingTemplate, OnboardingTemplateTask } from "../../types";

import { TemplateTaskRow } from "./TemplateTaskRow";

const HEADER_AUTOSAVE_DELAY = 700;

interface TemplateEditDialogProps {
  open: boolean;
  templateId: ID | null;
  onClose: () => void;
}

export function TemplateEditDialog({
  open,
  templateId,
  onClose,
}: TemplateEditDialogProps) {
  const detail = useTemplate(templateId ?? undefined);
  const template = detail.data;

  const updateMut = useUpdateTemplate();
  const archiveMut = useArchiveTemplate();
  const deleteMut = useDeleteTemplate();
  const addTaskMut = useAddTemplateTask();
  const reorderMut = useReorderTemplateTasks();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template?.name ?? "Mẫu onboarding"}</DialogTitle>
          <DialogDescription>
            Chỉnh sửa thông tin và danh sách công việc. Mọi thay đổi tự lưu.
          </DialogDescription>
        </DialogHeader>

        {detail.isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
          </div>
        ) : detail.error ? (
          <p className="py-8 text-sm text-destructive">
            Lỗi: {(detail.error as Error).message ?? "không tải được mẫu"}
          </p>
        ) : !template ? null : (
          <TemplateEditBody
            // Remount when the underlying row identity flips so local form
            // state re-initialises from props (avoids the
            // set-state-in-effect anti-pattern).
            key={template.id}
            template={template}
            onUpdate={async (data) => {
              try {
                await updateMut.mutateAsync({ id: template.id, data });
              } catch (err) {
                toast.error("Không lưu được", {
                  description:
                    err instanceof Error ? err.message : "Vui lòng thử lại.",
                });
              }
            }}
            onAddTask={async () => {
              try {
                await addTaskMut.mutateAsync({
                  templateId: template.id,
                  data: { title: "Công việc mới" },
                });
              } catch (err) {
                toast.error("Không thêm được công việc", {
                  description:
                    err instanceof Error ? err.message : "Vui lòng thử lại.",
                });
              }
            }}
            onReorderTasks={async (ids) => {
              try {
                await reorderMut.mutateAsync({
                  templateId: template.id,
                  data: { ids },
                });
              } catch (err) {
                toast.error("Không sắp xếp được", {
                  description:
                    err instanceof Error ? err.message : "Vui lòng thử lại.",
                });
              }
            }}
            addingTask={addTaskMut.isPending}
          />
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            {template && template.isActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!confirm("Lưu trữ mẫu này? Mẫu sẽ không còn áp tự động."))
                    return;
                  try {
                    await archiveMut.mutateAsync(template.id);
                    toast.success("Đã lưu trữ mẫu");
                  } catch (err) {
                    toast.error("Không lưu trữ được", {
                      description:
                        err instanceof Error
                          ? err.message
                          : "Vui lòng thử lại.",
                    });
                  }
                }}
                disabled={archiveMut.isPending}
              >
                <Archive className="mr-1 h-3.5 w-3.5" /> Lưu trữ
              </Button>
            )}
            {template && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={async () => {
                  if (!confirm("Xoá mẫu? Hành động không thể hoàn tác.")) return;
                  try {
                    await deleteMut.mutateAsync(template.id);
                    toast.success("Đã xoá mẫu");
                    onClose();
                  } catch (err) {
                    toast.error("Không xoá được mẫu", {
                      description:
                        err instanceof Error
                          ? err.message
                          : "Vui lòng thử lại.",
                    });
                  }
                }}
                disabled={deleteMut.isPending}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Xoá
              </Button>
            )}
          </div>
          <Button variant="default" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TemplateEditBodyProps {
  template: OnboardingTemplate;
  onUpdate: (data: {
    name?: string;
    description?: string | null;
    isActive?: boolean;
    isDefault?: boolean;
  }) => Promise<void>;
  onAddTask: () => Promise<void>;
  onReorderTasks: (ids: ID[]) => Promise<void>;
  addingTask: boolean;
}

function TemplateEditBody({
  template,
  onUpdate,
  onAddTask,
  onReorderTasks,
  addingTask,
}: TemplateEditBodyProps) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [isActive, setIsActive] = useState(template.isActive);
  const [isDefault, setIsDefault] = useState(template.isDefault);

  // Auto-save header fields with debounce.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (
      name === template.name &&
      description === (template.description ?? "") &&
      isActive === template.isActive &&
      isDefault === template.isDefault
    ) {
      return;
    }
    if (!name.trim()) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onUpdate({
        name: name.trim(),
        description: description || null,
        isActive,
        isDefault,
      });
    }, HEADER_AUTOSAVE_DELAY);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, description, isActive, isDefault]);

  // Local sortable order — initialised from props. Body component is
  // remounted via `key` whenever the server-side list identity flips
  // (TemplateEditDialog supplies key based on tasks signature).
  const [tasks, setTasks] = useState<OnboardingTemplateTask[]>(template.tasks);

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = tasks.findIndex((t) => t.id === active.id);
    const newIdx = tasks.findIndex((t) => t.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(tasks, oldIdx, newIdx);
    setTasks(next);
    await onReorderTasks(next.map((t) => t.id));
  };

  return (
    <div className="space-y-5">
      {/* Header info */}
      <section className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="onboarding-template-name">Tên mẫu</Label>
          <Input
            id="onboarding-template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Mô tả</Label>
          <RichTextDescriptionField
            value={description}
            onChange={setDescription}
            placeholder="Ghi chú nội bộ về cách dùng mẫu này..."
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start justify-between gap-3 rounded-md border p-3">
            <div className="space-y-0.5">
              <Label>Mẫu mặc định</Label>
              <p className="text-xs text-muted-foreground">
                Chỉ 1 mẫu mặc định mỗi tổ chức.
              </p>
            </div>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </div>
          <div className="flex items-start justify-between gap-3 rounded-md border p-3">
            <div className="space-y-0.5">
              <Label>Đang dùng</Label>
              <p className="text-xs text-muted-foreground">
                Mẫu đã lưu trữ không xuất hiện trong danh sách áp dụng.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
      </section>

      {/* Task list */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Danh sách công việc{" "}
            <span className="text-muted-foreground">({tasks.length})</span>
          </h3>
        </div>

        {tasks.length === 0 ? (
          <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
            Chưa có công việc nào. Bấm &quot;Thêm công việc&quot; bên dưới.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <TemplateTaskRow
                    key={task.id}
                    task={task}
                    templateId={template.id}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddTask}
          disabled={addingTask}
          className="w-full"
        >
          {addingTask ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="mr-1 h-3.5 w-3.5" />
          )}
          Thêm công việc
        </Button>
      </section>
    </div>
  );
}
