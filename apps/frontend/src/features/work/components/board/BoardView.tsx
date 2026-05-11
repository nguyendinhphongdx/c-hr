"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { ID } from "@/lib/types";

import {
  useDeleteSection,
  useProjectSections,
  useReorderSections,
  useUpdateSection,
} from "../../hooks/useProjects";
import { useReorderTasks, useTasks } from "../../hooks/useTasks";
import type { TaskListItem, TaskSection } from "../../types";
import { TaskCreateDialog } from "../task/TaskCreateDialog";
import { BoardAddColumn } from "./BoardAddColumn";
import { BoardCard } from "./BoardCard";
import { BoardColumn } from "./BoardColumn";

interface BoardViewProps {
  projectId: ID;
  onOpenTask: (code: string) => void;
}

interface BoardColumnState {
  section: TaskSection;
  tasks: TaskListItem[];
}

interface BoardState {
  columns: BoardColumnState[];
}

interface DndKind {
  kind: "section" | "task" | "column";
  sectionId?: ID | null;
  taskId?: ID;
}

function readKind(data: unknown): DndKind | null {
  if (!data || typeof data !== "object") return null;
  const k = (data as { kind?: unknown }).kind;
  if (k === "section" || k === "task" || k === "column") {
    return data as DndKind;
  }
  return null;
}

function buildBoardState(
  sections: TaskSection[] | undefined,
  tasks: TaskListItem[] | undefined,
): BoardState {
  const sortedSections = (sections ?? [])
    .slice()
    .sort((a, b) => a.order - b.order);
  const tasksBySection = new Map<ID, TaskListItem[]>();
  for (const s of sortedSections) tasksBySection.set(s.id, []);
  for (const t of tasks ?? []) {
    if (!t.sectionId) continue;
    const arr = tasksBySection.get(t.sectionId);
    if (arr) arr.push(t);
  }
  for (const arr of tasksBySection.values()) {
    arr.sort((a, b) => a.order - b.order);
  }
  return {
    columns: sortedSections.map((section) => ({
      section,
      tasks: tasksBySection.get(section.id) ?? [],
    })),
  };
}

export function BoardView({ projectId, onOpenTask }: BoardViewProps) {
  const sectionsQuery = useProjectSections(projectId);
  const tasksQuery = useTasks({ projectId, includeDone: true });

  const reorderSections = useReorderSections();
  const reorderTasks = useReorderTasks();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();

  const [board, setBoard] = useState<BoardState>(() => ({ columns: [] }));
  const snapshotRef = useRef<BoardState | null>(null);

  useEffect(() => {
    setBoard(buildBoardState(sectionsQuery.data, tasksQuery.data));
  }, [sectionsQuery.data, tasksQuery.data]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createSection, setCreateSection] = useState<ID | null>(null);
  const openCreate = (sectionId: ID | null) => {
    setCreateSection(sectionId);
    setCreateOpen(true);
  };

  const [activeTask, setActiveTask] = useState<TaskListItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const sectionIds = useMemo(
    () => board.columns.map((c) => c.section.id),
    [board.columns],
  );

  const findTaskLocation = (
    state: BoardState,
    taskId: ID,
  ): { colIdx: number; rowIdx: number } | null => {
    for (let i = 0; i < state.columns.length; i++) {
      const idx = state.columns[i].tasks.findIndex((t) => t.id === taskId);
      if (idx >= 0) return { colIdx: i, rowIdx: idx };
    }
    return null;
  };

  const findColumnByItem = (state: BoardState, id: ID): number => {
    const direct = state.columns.findIndex((c) => c.section.id === id);
    if (direct >= 0) return direct;
    const loc = findTaskLocation(state, id);
    return loc ? loc.colIdx : -1;
  };

  const handleDragStart = (e: DragStartEvent) => {
    const kind = readKind(e.active.data.current);
    if (kind?.kind === "task" && kind.taskId) {
      const loc = findTaskLocation(board, kind.taskId);
      if (loc) {
        setActiveTask(board.columns[loc.colIdx].tasks[loc.rowIdx]);
      }
    }
    snapshotRef.current = board;
  };

  const revertSnapshot = () => {
    if (snapshotRef.current) setBoard(snapshotRef.current);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const activeKind = readKind(active.data.current);
    if (!activeKind) return;

    if (activeKind.kind === "section") {
      const oldIdx = board.columns.findIndex(
        (c) => c.section.id === active.id,
      );
      const newIdx = board.columns.findIndex(
        (c) => c.section.id === over.id,
      );
      if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return;
      const nextColumns = arrayMove(board.columns, oldIdx, newIdx);
      const ids = nextColumns.map((c) => c.section.id);
      setBoard({ columns: nextColumns });
      reorderSections.mutate(
        { projectId, data: { ids } },
        {
          onError: (err) => {
            revertSnapshot();
            toast.error("Không sắp xếp được cột", {
              description:
                err instanceof Error ? err.message : "Vui lòng thử lại.",
            });
          },
        },
      );
      return;
    }

    if (activeKind.kind !== "task" || !activeKind.taskId) return;

    const fromLoc = findTaskLocation(board, activeKind.taskId as ID);
    if (!fromLoc) return;
    const fromCol = board.columns[fromLoc.colIdx];
    const moving = fromCol.tasks[fromLoc.rowIdx];

    const overKind = readKind(over.data.current);
    const overColIdx =
      overKind?.kind === "column" || overKind?.kind === "section"
        ? board.columns.findIndex((c) => c.section.id === over.id)
        : findColumnByItem(board, over.id as ID);
    if (overColIdx < 0) return;
    const toCol = board.columns[overColIdx];

    if (fromLoc.colIdx === overColIdx) {
      const overIdx = toCol.tasks.findIndex((t) => t.id === over.id);
      if (overIdx < 0 || overIdx === fromLoc.rowIdx) return;
      const nextTasks = arrayMove(toCol.tasks, fromLoc.rowIdx, overIdx);
      const nextColumns = board.columns.map((c, i) =>
        i === overColIdx ? { ...c, tasks: nextTasks } : c,
      );
      setBoard({ columns: nextColumns });
      const ids = nextTasks.map((t) => t.id);
      reorderTasks.mutate(
        {
          projectId,
          sectionId: toCol.section.id,
          data: { ids },
        },
        {
          onError: (err) => {
            revertSnapshot();
            toast.error("Không sắp xếp được task", {
              description:
                err instanceof Error ? err.message : "Vui lòng thử lại.",
            });
          },
        },
      );
      return;
    }

    let insertIndex = toCol.tasks.findIndex((t) => t.id === over.id);
    if (insertIndex < 0) insertIndex = toCol.tasks.length;

    const nextFromTasks = fromCol.tasks.filter((t) => t.id !== moving.id);
    const movingMoved: TaskListItem = {
      ...moving,
      sectionId: toCol.section.id,
    };
    const nextToTasks = [
      ...toCol.tasks.slice(0, insertIndex),
      movingMoved,
      ...toCol.tasks.slice(insertIndex),
    ];
    const nextColumns = board.columns.map((c, i) => {
      if (i === fromLoc.colIdx) return { ...c, tasks: nextFromTasks };
      if (i === overColIdx) return { ...c, tasks: nextToTasks };
      return c;
    });
    setBoard({ columns: nextColumns });

    const newIds = nextToTasks.map((t) => t.id);
    reorderTasks.mutate(
      {
        projectId,
        sectionId: toCol.section.id,
        data: { ids: newIds },
      },
      {
        onError: (err) => {
          revertSnapshot();
          toast.error("Không di chuyển được task", {
            description:
              err instanceof Error ? err.message : "Vui lòng thử lại.",
          });
        },
      },
    );
  };

  const handleRenameSection = async (sectionId: ID, name: string) => {
    try {
      await updateSection.mutateAsync({ sectionId, data: { name } });
    } catch (err) {
      toast.error("Không đổi tên cột được", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
    }
  };

  const handleDeleteSection = async (sectionId: ID) => {
    if (!confirm("Xoá cột này? Cột phải trống mới xoá được.")) return;
    try {
      await deleteSection.mutateAsync(sectionId);
      toast.success("Đã xoá cột");
    } catch (err) {
      toast.error("Không xoá được cột", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
    }
  };

  if (sectionsQuery.isLoading || tasksQuery.isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Đang tải…</div>
    );
  }
  if (sectionsQuery.error || tasksQuery.error) {
    return (
      <div className="p-6 text-sm text-destructive">
        Lỗi:{" "}
        {(
          (sectionsQuery.error as Error) ||
          (tasksQuery.error as Error)
        )?.message}
      </div>
    );
  }

  const sectionList = board.columns.map((c) => c.section);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="flex h-full min-h-0 gap-3 overflow-x-auto p-3">
          <SortableContext
            items={sectionIds}
            strategy={horizontalListSortingStrategy}
          >
            {board.columns.map((c) => (
              <BoardColumn
                key={c.section.id}
                section={c.section}
                tasks={c.tasks}
                onAddTask={() => openCreate(c.section.id)}
                onOpenTask={onOpenTask}
                onRename={(name) => handleRenameSection(c.section.id, name)}
                onDelete={() => handleDeleteSection(c.section.id)}
              />
            ))}
          </SortableContext>
          <BoardAddColumn projectId={projectId} />
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-72 rotate-2">
              <BoardCard task={activeTask} onOpen={() => undefined} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
        defaultSectionId={createSection}
        sections={sectionList}
      />
    </>
  );
}
