"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Loader2,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextDescriptionField } from "@/features/calendar/components/event/RichTextDescriptionField";
import { UserPicker, useOrgUsers } from "@/features/users";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

import {
  useDeleteTemplateTask,
  useUpdateTemplateTask,
} from "../../hooks/useOnboardingTemplates";
import type { AssigneeRole, OnboardingTemplateTask } from "../../types";

const ROLE_LABELS: Record<AssigneeRole, string> = {
  HR: "HR",
  MANAGER: "Quản lý trực tiếp",
  EMPLOYEE: "Nhân viên mới",
  IT: "IT",
  CUSTOM: "Người cụ thể",
};

interface TemplateTaskRowProps {
  task: OnboardingTemplateTask;
  templateId: ID;
}

const AUTO_SAVE_DELAY = 600;

export function TemplateTaskRow({ task, templateId }: TemplateTaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { kind: "template-task" } });

  const updateMut = useUpdateTemplateTask();
  const deleteMut = useDeleteTemplateTask();
  const orgUsers = useOrgUsers({ limit: 200 });

  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [role, setRole] = useState<AssigneeRole>(task.defaultAssigneeRole);
  const [userId, setUserId] = useState<ID | null>(task.defaultAssigneeUserId);
  const [dueOffsetDays, setDueOffsetDays] = useState<number>(task.dueOffsetDays);
  const [savedFlash, setSavedFlash] = useState(false);

  // Debounced auto-save — see report block: each change schedules a save
  // after AUTO_SAVE_DELAY ms of inactivity.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (
      title === task.title &&
      description === (task.description ?? "") &&
      role === task.defaultAssigneeRole &&
      userId === task.defaultAssigneeUserId &&
      dueOffsetDays === task.dueOffsetDays
    ) {
      return;
    }
    if (role === "CUSTOM" && !userId) return; // wait for user pick
    if (!title.trim()) return; // do not save empty title

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      updateMut.mutate(
        {
          id: task.id,
          data: {
            title: title.trim(),
            description: description || null,
            defaultAssigneeRole: role,
            defaultAssigneeUserId: role === "CUSTOM" ? userId : null,
            dueOffsetDays,
          },
        },
        {
          onSuccess: () => {
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 1200);
          },
        },
      );
    }, AUTO_SAVE_DELAY);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, role, userId, dueOffsetDays]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as const;

  const assigneeFallback = (() => {
    if (!userId) return null;
    const u = orgUsers.data?.find((x) => x.id === userId);
    return u ? { name: u.name, email: u.email } : null;
  })();

  const handleDelete = () => {
    if (!confirm("Xoá công việc này khỏi mẫu?")) return;
    deleteMut.mutate({ id: task.id, templateId });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-md border bg-card",
        isDragging && "opacity-60 ring-2 ring-ring",
      )}
    >
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          aria-label="Kéo để sắp xếp"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground"
          aria-label={expanded ? "Thu gọn" : "Mở rộng"}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tên công việc"
          className="h-8 flex-1"
        />
        <Badge variant="outline" className="hidden whitespace-nowrap sm:inline-flex">
          {ROLE_LABELS[role]}
        </Badge>
        <span className="hidden whitespace-nowrap text-xs text-muted-foreground md:inline">
          {formatOffset(dueOffsetDays)}
        </span>
        <span className="w-5 text-emerald-600 dark:text-emerald-400">
          {updateMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : savedFlash ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : null}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Xoá công việc"
          onClick={handleDelete}
          disabled={deleteMut.isPending}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {expanded && (
        <div className="space-y-3 border-t bg-muted/20 px-3 py-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Mô tả</Label>
            <RichTextDescriptionField
              value={description}
              onChange={setDescription}
              placeholder="Hướng dẫn chi tiết, link tài liệu..."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Người phụ trách mặc định</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as AssigneeRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as AssigneeRole[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Hạn (ngày so với ngày đi làm)</Label>
              <Input
                type="number"
                value={Number.isFinite(dueOffsetDays) ? dueOffsetDays : 0}
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value, 10);
                  setDueOffsetDays(Number.isFinite(n) ? n : 0);
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                0 = ngày đi làm, 7 = trong 1 tuần, -3 = trước 3 ngày.
              </p>
            </div>
          </div>

          {role === "CUSTOM" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Người cụ thể</Label>
              <UserPicker
                value={userId}
                onChange={(u) => setUserId(u ? u.id : null)}
                placeholder="Chọn người..."
                fallback={assigneeFallback}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatOffset(days: number): string {
  if (days === 0) return "Ngày đi làm";
  if (days > 0) return `+${days} ngày`;
  return `${days} ngày`;
}
