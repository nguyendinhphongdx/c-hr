"use client";

import {
  differenceInCalendarDays,
  isBefore,
  isToday,
  startOfDay,
} from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Loader2,
  Search,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

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
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

import { useProjects } from "../hooks/useProjects";
import { useTasks, useUpdateTask } from "../hooks/useTasks";
import type {
  TaskListItem,
  TaskPriority,
  TaskStatus,
} from "../types";
import { cycleStatus, TaskRow } from "../components/task/TaskRow";
import { TaskDetailDrawer } from "../components/task/TaskDetailDrawer";

type StatusFilter = "OPEN" | "ALL" | TaskStatus;
type PriorityFilter = "ALL" | TaskPriority;

type BucketKey = "overdue" | "today" | "thisWeek" | "later" | "noDate";

interface BucketDef {
  key: BucketKey;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: "destructive" | "warning" | "info" | "muted";
}

const BUCKETS: BucketDef[] = [
  {
    key: "overdue",
    label: "Quá hạn",
    description: "Còn việc cần xử lý — đã trễ hạn.",
    icon: AlertTriangle,
    tone: "destructive",
  },
  {
    key: "today",
    label: "Hôm nay",
    description: "Đến hạn hôm nay.",
    icon: CalendarClock,
    tone: "warning",
  },
  {
    key: "thisWeek",
    label: "Tuần này",
    description: "Đến hạn trong 7 ngày tới.",
    icon: CalendarRange,
    tone: "info",
  },
  {
    key: "later",
    label: "Sau",
    description: "Có hạn xa hơn 1 tuần.",
    icon: CalendarDays,
    tone: "muted",
  },
  {
    key: "noDate",
    label: "Không có hạn",
    description: "Chưa đặt hạn.",
    icon: HelpCircle,
    tone: "muted",
  },
];

function bucketOf(task: TaskListItem, today: Date): BucketKey {
  if (!task.dueDate) return "noDate";
  // dueDate from BE is a Date column serialized as ISO. We compare by
  // calendar day so client timezone doesn't shift the bucket.
  const due = startOfDay(new Date(task.dueDate));
  if (isToday(due)) return "today";
  if (isBefore(due, today)) return "overdue";
  const diff = differenceInCalendarDays(due, today);
  if (diff <= 7) return "thisWeek";
  return "later";
}

const TONE_CLASSES: Record<BucketDef["tone"], string> = {
  destructive: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-sky-600 dark:text-sky-400",
  muted: "text-muted-foreground",
};

export function MyTasksView() {
  const { user, isLoading: authLoading } = useAuth();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("OPEN");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
  const [projectFilter, setProjectFilter] = useState<ID | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [selectedTaskCode, setSelectedTaskCode] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<BucketKey, boolean>>({
    overdue: false,
    today: false,
    thisWeek: false,
    later: false,
    noDate: false,
  });
  // Per-parent subtask collapse state. undefined = expanded (default).
  // Only subtasks ALSO in the user's task list render nested — the
  // _count.subtasks badge may exceed visible nested rows when some
  // subtasks are assigned to other people.
  const [collapsedTasks, setCollapsedTasks] = useState<Record<string, boolean>>({});
  const toggleTaskCollapsed = (id: string) =>
    setCollapsedTasks((s) => ({ ...s, [id]: !s[id] }));

  const update = useUpdateTask();

  // Status semantics:
  //   "OPEN" (default) → BE default (drops DONE/CANCELLED).
  //   "ALL"            → includeDone=true, no status filter.
  //   specific status  → status=X (still send includeDone=true so picking
  //                      DONE/CANCELLED actually returns those).
  const statusParam: TaskStatus | undefined =
    statusFilter === "OPEN" || statusFilter === "ALL" ? undefined : statusFilter;
  const includeDoneParam = statusFilter !== "OPEN";

  const tasksQuery = useTasks(
    {
      assigneeId: user?.id,
      status: statusParam,
      includeDone: includeDoneParam,
      q: search.trim() || undefined,
    },
    !!user?.id,
  );

  const projectsQuery = useProjects();
  const userId = user?.id ?? null;
  const memberProjects = useMemo(() => {
    if (!projectsQuery.data || !userId) return [];
    return projectsQuery.data.filter(
      (p) =>
        p.ownerId === userId || p.members.some((m) => m.userId === userId),
    );
  }, [projectsQuery.data, userId]);

  const today = useMemo(() => startOfDay(new Date()), []);

  const filteredTasks = useMemo(() => {
    const rows = tasksQuery.data ?? [];
    return rows.filter((t) => {
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) {
        return false;
      }
      if (projectFilter !== "ALL" && t.projectId !== projectFilter) {
        return false;
      }
      return true;
    });
  }, [tasksQuery.data, priorityFilter, projectFilter]);

  // Index subtasks by parent — but only when the parent is ALSO in the
  // filtered list. Subtasks whose parent isn't visible bucket as standalone.
  const subtasksByParent = useMemo(() => {
    const parentIds = new Set(
      filteredTasks.filter((t) => !t.parentTaskId).map((t) => t.id),
    );
    const m = new Map<string, TaskListItem[]>();
    for (const t of filteredTasks) {
      if (t.parentTaskId && parentIds.has(t.parentTaskId)) {
        const arr = m.get(t.parentTaskId) ?? [];
        arr.push(t);
        m.set(t.parentTaskId, arr);
      }
    }
    return m;
  }, [filteredTasks]);

  const groups = useMemo(() => {
    const map: Record<BucketKey, TaskListItem[]> = {
      overdue: [],
      today: [],
      thisWeek: [],
      later: [],
      noDate: [],
    };
    const parentIds = new Set(
      filteredTasks.filter((t) => !t.parentTaskId).map((t) => t.id),
    );
    for (const t of filteredTasks) {
      // Skip subtasks whose parent is in the list — they render nested.
      if (t.parentTaskId && parentIds.has(t.parentTaskId)) continue;
      // Tasks that are DONE/CANCELLED never count as overdue, regardless
      // of due date — they're finished.
      if (
        (t.status === "DONE" || t.status === "CANCELLED") &&
        t.dueDate &&
        isBefore(startOfDay(new Date(t.dueDate)), today)
      ) {
        map.later.push(t);
        continue;
      }
      map[bucketOf(t, today)].push(t);
    }
    return map;
  }, [filteredTasks, today]);

  const renderTaskRows = (items: TaskListItem[]) =>
    items.flatMap((t) => {
      const subtasks = subtasksByParent.get(t.id) ?? [];
      const hasSubtasks = subtasks.length > 0;
      const isOpen = hasSubtasks && !collapsedTasks[t.id];
      const rows = [
        <TaskRow
          key={t.id}
          task={t}
          showProject
          onOpen={(task) => setSelectedTaskCode(task.code)}
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
              showProject
              depth={1}
              onOpen={(task) => setSelectedTaskCode(task.code)}
              onCycleStatus={handleCycleStatus}
            />,
          );
        }
      }
      return rows;
    });

  const selectedTask = useMemo(
    () =>
      selectedTaskCode
        ? (tasksQuery.data ?? []).find((t) => t.code === selectedTaskCode) ?? null
        : null,
    [tasksQuery.data, selectedTaskCode],
  );

  const handleCycleStatus = async (t: TaskListItem) => {
    const next = cycleStatus(t.status);
    if (next === t.status) return;
    try {
      await update.mutateAsync({ id: t.id, data: { status: next } });
    } catch {
      // toasted globally
    }
  };

  const toggleCollapsed = (key: BucketKey) =>
    setCollapsed((s) => ({ ...s, [key]: !s[key] }));

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
      </div>
    );
  }
  if (!user) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Cần đăng nhập để xem việc của bạn.
      </div>
    );
  }

  const totalShown = filteredTasks.length;
  const isEmpty =
    !tasksQuery.isLoading && !tasksQuery.error && totalShown === 0;

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold leading-tight">Việc của tôi</h1>
          <p className="text-xs text-muted-foreground">
            Task được gán cho bạn — cộng dồn mọi dự án.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          {tasksQuery.isLoading
            ? "Đang tải…"
            : `${totalShown} task${totalShown === 1 ? "" : ""}`}
        </div>
      </header>

      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-background px-6 py-3">
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
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OPEN">Tất cả còn mở</SelectItem>
            <SelectItem value="ALL">Tất cả</SelectItem>
            <SelectItem value="TODO">Cần làm</SelectItem>
            <SelectItem value="IN_PROGRESS">Đang làm</SelectItem>
            <SelectItem value="REVIEW">Đang xem xét</SelectItem>
            <SelectItem value="DONE">Hoàn thành</SelectItem>
            <SelectItem value="CANCELLED">Đã huỷ</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={priorityFilter}
          onValueChange={(v) => setPriorityFilter(v as PriorityFilter)}
        >
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả ưu tiên</SelectItem>
            <SelectItem value="URGENT">Khẩn cấp</SelectItem>
            <SelectItem value="HIGH">Cao</SelectItem>
            <SelectItem value="MEDIUM">Trung bình</SelectItem>
            <SelectItem value="LOW">Thấp</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={projectFilter}
          onValueChange={(v) => setProjectFilter(v as typeof projectFilter)}
        >
          <SelectTrigger className="h-8 w-[200px] text-xs">
            <SelectValue placeholder="Dự án" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả dự án</SelectItem>
            {memberProjects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tasksQuery.isLoading && (
          <p className="text-sm text-muted-foreground">Đang tải…</p>
        )}
        {tasksQuery.error && (
          <p className="text-sm text-destructive">
            Lỗi: {(tasksQuery.error as Error).message}
          </p>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
            <p className="text-sm font-medium">Không có task nào</p>
            <p className="text-xs text-muted-foreground">
              Hiện chưa có việc nào được gán cho bạn theo bộ lọc này.
            </p>
          </div>
        )}

        {!tasksQuery.isLoading && !isEmpty && (
          <div className="space-y-4">
            {BUCKETS.map((b) => {
              const rows = groups[b.key];
              const Icon = b.icon;
              const isCollapsed = collapsed[b.key];
              return (
                <section key={b.key} className="rounded-lg border bg-background">
                  <header className="flex items-center justify-between px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleCollapsed(b.key)}
                      className="flex items-center gap-2 text-sm font-medium hover:text-foreground"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <Icon className={cn("h-4 w-4", TONE_CLASSES[b.tone])} />
                      <span className={cn(b.tone === "destructive" && "text-destructive")}>
                        {b.label}
                      </span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                        {rows.length}
                      </span>
                    </button>
                    <span className="text-[11px] text-muted-foreground">
                      {b.description}
                    </span>
                  </header>
                  {!isCollapsed && (
                    <div className="border-t">
                      {rows.length === 0 ? (
                        <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                          Trống.
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="text-xs">
                              <TableHead className="w-8" />
                              <TableHead className="w-24">Code</TableHead>
                              <TableHead className="w-44">Dự án</TableHead>
                              <TableHead>Tiêu đề</TableHead>
                              <TableHead className="w-12">Ưu tiên</TableHead>
                              <TableHead className="w-12">Người làm</TableHead>
                              <TableHead className="w-28">Hạn</TableHead>
                              <TableHead className="w-40">Tag</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>{renderTaskRows(rows)}</TableBody>
                        </Table>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      <TaskDetailDrawer
        open={selectedTaskCode !== null}
        onClose={() => setSelectedTaskCode(null)}
        idOrCode={selectedTaskCode}
        projectId={selectedTask?.projectId ?? ""}
        onNavigate={setSelectedTaskCode}
      />
    </div>
  );
}
