"use client";

import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useProject } from "../hooks/useProjects";
import { ProjectHeader } from "../components/shell/ProjectHeader";
import { ProjectSettingsDrawer } from "../components/project/ProjectSettingsDrawer";
import { ProjectReportPanel } from "../components/reports/ProjectReportPanel";
import { TaskListTab } from "../components/task/TaskListTab";
import { TaskDetailDrawer } from "../components/task/TaskDetailDrawer";
import { BoardView } from "../components/board/BoardView";

interface ProjectDetailViewProps {
  slug: string;
}

export function ProjectDetailView({ slug }: ProjectDetailViewProps) {
  const { data: project, isLoading, error } = useProject(slug);
  const searchParams = useSearchParams();
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Initialize from `?taskCode=` so RunningTimerBar (and any other deep
  // link) can auto-open the drawer. After that, the user controls it.
  const [selectedTaskCode, setSelectedTaskCode] = useState<string | null>(
    () => searchParams.get("taskCode"),
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
      </div>
    );
  }
  if (error || !project) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        {error
          ? `Lỗi: ${(error as Error).message}`
          : "Không tìm thấy dự án này"}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ProjectHeader
        project={project}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <Tabs defaultValue="list" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-6 mt-3">
          <TabsTrigger value="list">Danh sách</TabsTrigger>
          <TabsTrigger value="board">Bảng</TabsTrigger>
          <TabsTrigger value="reports">Báo cáo</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="flex-1 overflow-y-auto p-6">
          <TaskListTab
            projectId={project.id}
            onOpenTask={setSelectedTaskCode}
          />
        </TabsContent>

        <TabsContent value="board" className="flex-1 overflow-hidden p-0">
          <BoardView projectId={project.id} onOpenTask={setSelectedTaskCode} />
        </TabsContent>

        <TabsContent value="reports" className="flex-1 overflow-y-auto p-6">
          <ProjectReportPanel projectId={project.id} />
        </TabsContent>
      </Tabs>

      <TaskDetailDrawer
        open={selectedTaskCode !== null}
        onClose={() => setSelectedTaskCode(null)}
        idOrCode={selectedTaskCode}
        projectId={project.id}
      />

      <ProjectSettingsDrawer
        project={project}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
