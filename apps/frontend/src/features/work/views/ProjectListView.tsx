"use client";

import { Loader2, Plus, Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useProjects } from "../hooks/useProjects";
import type { ProjectStatus } from "../types";
import { ProjectCard } from "../components/project/ProjectCard";
import { ProjectCreateDialog } from "../components/project/ProjectCreateDialog";

const STATUS_FILTERS: { value: "ALL" | ProjectStatus; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "PLANNING", label: "Lên kế hoạch" },
  { value: "ACTIVE", label: "Đang chạy" },
  { value: "PAUSED", label: "Tạm dừng" },
  { value: "DONE", label: "Hoàn thành" },
];

export function ProjectListView() {
  const [status, setStatus] = useState<"ALL" | ProjectStatus>("ALL");
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error } = useProjects({
    status: status === "ALL" ? undefined : status,
    q: q.trim() || undefined,
  });

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold leading-tight">Dự án</h1>
          <p className="text-xs text-muted-foreground">
            Quản lý dự án và tác vụ.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo dự án
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 pl-7"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as typeof status)}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dự án…
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">
            Lỗi: {(error as Error).message}
          </p>
        ) : !data || data.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>

      <ProjectCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <p className="text-sm font-medium">Chưa có dự án nào</p>
      <p className="text-xs text-muted-foreground">
        Tạo dự án đầu tiên để bắt đầu tổ chức công việc.
      </p>
      <Button onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" />
        Tạo dự án
      </Button>
    </div>
  );
}
