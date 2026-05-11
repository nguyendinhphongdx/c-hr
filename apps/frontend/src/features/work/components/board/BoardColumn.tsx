"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { TaskListItem, TaskSection } from "../../types";
import { BoardCard } from "./BoardCard";

interface BoardColumnProps {
  section: TaskSection;
  tasks: TaskListItem[];
  onAddTask: () => void;
  onOpenTask: (code: string) => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
}

export function BoardColumn({
  section,
  tasks,
  onAddTask,
  onOpenTask,
  onRename,
  onDelete,
}: BoardColumnProps) {
  const sortable = useSortable({
    id: section.id,
    data: { kind: "section", sectionId: section.id },
  });
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = sortable;

  const droppable = useDroppable({
    id: section.id,
    data: { kind: "column", sectionId: section.id },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(section.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(section.name);
  }, [section.name]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitRename = () => {
    const next = draft.trim();
    setEditing(false);
    if (!next || next === section.name) {
      setDraft(section.name);
      return;
    }
    onRename(next);
  };

  const taskIds = tasks.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex h-full w-72 shrink-0 flex-col rounded-lg border bg-muted/30",
        isDragging && "opacity-60",
      )}
    >
      <header className="flex items-center gap-1 px-2 py-2">
        <button
          type="button"
          aria-label="Kéo để di chuyển cột"
          className="cursor-grab rounded p-0.5 text-muted-foreground hover:bg-accent active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {editing ? (
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
              if (e.key === "Escape") {
                setDraft(section.name);
                setEditing(false);
              }
            }}
            className="h-7 flex-1 text-sm font-medium"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-1 truncate rounded px-1 py-0.5 text-left text-sm font-medium hover:bg-accent/60"
            title={section.name}
          >
            {section.name}
          </button>
        )}

        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {tasks.length}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label="Tuỳ chọn"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setEditing(true)} className="gap-2">
              Đổi tên
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Xoá cột
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div
        ref={droppable.setNodeRef}
        className={cn(
          "flex-1 space-y-1.5 overflow-y-auto px-2 pb-2",
          droppable.isOver && "rounded-md bg-accent/20",
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <BoardCard key={t.id} task={t} onOpen={onOpenTask} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="rounded-md border border-dashed py-6 text-center text-[11px] text-muted-foreground">
            Kéo task vào đây
          </div>
        )}
      </div>

      <footer className="border-t bg-background/40 p-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={onAddTask}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Tạo task
        </Button>
      </footer>
    </div>
  );
}
