"use client";

import { ChevronDown, ChevronRight, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

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
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/features/auth";
import { UserPicker } from "@/features/users/components/UserPicker";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

import { useTasks, useUpdateTask } from "../../hooks/useTasks";
import { useProjectSections } from "../../hooks/useProjects";
import type {
  TaskListItem,
  TaskStatus,
} from "../../types";
import { TaskCreateDialog } from "./TaskCreateDialog";
import { cycleStatus, TaskRow } from "./TaskRow";

interface TaskListTabProps {
  projectId: ID;
  onOpenTask: (code: string) => void;
}

type AssigneeFilter = "ALL" | "ME" | "USER";

export function TaskListTab({ projectId, onOpenTask }: TaskListTabProps) {
  const { user } = useAuth();
  const sections = useProjectSections(projectId);

  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");
  const [includeDone, setIncludeDone] = useState(false);
  const [assigneeMode, setAssigneeMode] = useState<AssigneeFilter>("ALL");
  const [assigneePick, setAssigneePick] = useState<ID | null>(null);
  const [search, setSearch] = useState("");

  const assigneeId =
    assigneeMode === "ME" && user
      ? user.id
      : assigneeMode === "USER"
        ? assigneePick ?? undefined
        : undefined;

  const tasksQuery = useTasks({
    projectId,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    assigneeId: assigneeId ?? undefined,
    q: search.trim() || undefined,
    includeDone,
  });

  const tasks = tasksQuery.data ?? [];
  // Split: root tasks (parentTaskId === null) group by section; subtasks
  // render only when their parent is expanded.
  const { tasksBySection, subtasksByParent } = useMemo(() => {
    const bySection = new Map<ID | "__none__", TaskListItem[]>();
    const byParent = new Map<ID, TaskListItem[]>();
    for (const t of tasks) {
      if (t.parentTaskId) {
        const arr = byParent.get(t.parentTaskId) ?? [];
        arr.push(t);
        byParent.set(t.parentTaskId, arr);
      } else {
        const key = t.sectionId ?? "__none__";
        const arr = bySection.get(key) ?? [];
        arr.push(t);
        bySection.set(key, arr);
      }
    }
    return { tasksBySection: bySection, subtasksByParent: byParent };
  }, [tasks]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleCollapsed = (key: string) =>
    setCollapsed((s) => ({ ...s, [key]: !s[key] }));

  // Per-parent collapse state. undefined = expanded (default — subtasks
  // visible). true = user collapsed. Inverted from "expanded" so the
  // default-open behaviour falls out without seeding state.
  const [collapsedTasks, setCollapsedTasks] = useState<Record<string, boolean>>({});
  const toggleTaskCollapsed = (id: string) =>
    setCollapsedTasks((s) => ({ ...s, [id]: !s[id] }));

  const [createOpen, setCreateOpen] = useState(false);
  const [createSection, setCreateSection] = useState<ID | null>(null);
  const openCreate = (sectionId: ID | null) => {
    setCreateSection(sectionId);
    setCreateOpen(true);
  };

  const update = useUpdateTask();

  const handleCycleStatus = async (t: TaskListItem) => {
    const next = cycleStatus(t.status);
    if (next === t.status) return;
    try {
      await update.mutateAsync({ id: t.id, data: { status: next } });
    } catch {
      // toast handled globally; swallow here so the row stays responsive
    }
  };

  const renderTaskRows = (items: TaskListItem[]) =>
    items.flatMap((t) => {
      const subtasks = subtasksByParent.get(t.id) ?? [];
      const hasSubtasks = subtasks.length > 0;
      const isOpen = hasSubtasks && !collapsedTasks[t.id];
      const rows = [
        <TaskRow
          key={t.id}
          task={t}
          onOpen={(task) => onOpenTask(task.code)}
          onCycleStatus={handleCycleStatus}
          isExpanded={hasSubtasks ? isOpen : undefined}
          onToggleExpand={hasSubtasks ? () => toggleTaskCollapsed(t.id) : undefined}
        />,
      ];
      if (hasSubtasks && isOpen) {
        for (const sub of subtasks) {
          rows.push(
            <TaskRow
              key={sub.id}
              task={sub}
              onOpen={(task) => onOpenTask(task.code)}
              onCycleStatus={handleCycleStatus}
              depth={1}
            />,
          );
        }
      }
      return rows;
    });

  const sectionList = useMemo(() => {
    const list = (sections.data ?? []).slice().sort((a, b) => a.order - b.order);
    return list;
  }, [sections.data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm task hoặc code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-64 pl-8 text-sm"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
            <SelectItem value="TODO">Cần làm</SelectItem>
            <SelectItem value="IN_PROGRESS">Đang làm</SelectItem>
            <SelectItem value="REVIEW">Đang xem xét</SelectItem>
            <SelectItem value="DONE">Hoàn thành</SelectItem>
            <SelectItem value="CANCELLED">Đã huỷ</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={assigneeMode}
          onValueChange={(v) => setAssigneeMode(v as AssigneeFilter)}
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả người làm</SelectItem>
            <SelectItem value="ME">Tôi</SelectItem>
            <SelectItem value="USER">Người cụ thể…</SelectItem>
          </SelectContent>
        </Select>
        {assigneeMode === "USER" && (
          <div className="w-[200px]">
            <UserPicker
              value={assigneePick}
              onChange={(u) => setAssigneePick(u?.id ?? null)}
              placeholder="Chọn người…"
            />
          </div>
        )}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={includeDone}
            onChange={(e) => setIncludeDone(e.target.checked)}
          />
          Hiện task hoàn thành
        </label>

        <div className="ml-auto">
          <Button size="sm" onClick={() => openCreate(null)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Tạo task
          </Button>
        </div>
      </div>

      {tasksQuery.isLoading && (
        <p className="text-sm text-muted-foreground">Đang tải…</p>
      )}
      {tasksQuery.error && (
        <p className="text-sm text-destructive">
          Lỗi: {(tasksQuery.error as Error).message}
        </p>
      )}

      {!tasksQuery.isLoading &&
        sectionList.map((s) => {
          const sectionTasks = tasksBySection.get(s.id) ?? [];
          const isCollapsed = collapsed[s.id];
          return (
            <section
              key={s.id}
              className="rounded-lg border bg-background"
            >
              <header className="flex items-center justify-between px-3 py-2">
                <button
                  type="button"
                  onClick={() => toggleCollapsed(s.id)}
                  className="flex items-center gap-1.5 text-sm font-medium hover:text-foreground"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {s.name}
                  <span className="text-xs font-normal text-muted-foreground">
                    {sectionTasks.length}
                  </span>
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openCreate(s.id)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Thêm
                </Button>
              </header>
              {!isCollapsed && (
                <div className={cn("border-t")}>
                  {sectionTasks.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                      Chưa có task nào trong nhóm này.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead className="w-8" />
                          <TableHead className="w-24">Code</TableHead>
                          <TableHead>Tiêu đề</TableHead>
                          <TableHead className="w-12">Ưu tiên</TableHead>
                          <TableHead className="w-12">Người làm</TableHead>
                          <TableHead className="w-28">Hạn</TableHead>
                          <TableHead className="w-40">Tag</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>{renderTaskRows(sectionTasks)}</TableBody>
                    </Table>
                  )}
                </div>
              )}
            </section>
          );
        })}

      {/* Tasks without a section — render last if any. */}
      {(tasksBySection.get("__none__")?.length ?? 0) > 0 && (
        <section className="rounded-lg border bg-background">
          <header className="flex items-center justify-between px-3 py-2 text-sm font-medium">
            Không có nhóm
            <span className="text-xs font-normal text-muted-foreground">
              {tasksBySection.get("__none__")?.length}
            </span>
          </header>
          <div className="border-t">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="w-8" />
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead className="w-12">Ưu tiên</TableHead>
                  <TableHead className="w-12">Người làm</TableHead>
                  <TableHead className="w-28">Hạn</TableHead>
                  <TableHead className="w-40">Tag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderTaskRows(tasksBySection.get("__none__") ?? [])}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      <TaskCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
        defaultSectionId={createSection}
        sections={sectionList}
      />
    </div>
  );
}
