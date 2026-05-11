"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useProject } from "../hooks/useProjects";
import { ProjectHeader } from "../components/shell/ProjectHeader";
import { ProjectSettingsDrawer } from "../components/project/ProjectSettingsDrawer";
import { TaskListTab } from "../components/task/TaskListTab";

interface ProjectDetailViewProps {
  slug: string;
}

export function ProjectDetailView({ slug }: ProjectDetailViewProps) {
  const { data: project, isLoading, error } = useProject(slug);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

      <Tabs defaultValue="list" className="flex-1 overflow-hidden">
        <TabsList className="mx-6 mt-3">
          <TabsTrigger value="list">Danh sách</TabsTrigger>
          <TabsTrigger value="board" disabled>
            Bảng (sắp có)
          </TabsTrigger>
          <TabsTrigger value="reports" disabled>
            Báo cáo (sắp có)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="flex-1 overflow-y-auto p-6">
          <TaskListTab projectId={project.id} />
        </TabsContent>
      </Tabs>

      <ProjectSettingsDrawer
        project={project}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
