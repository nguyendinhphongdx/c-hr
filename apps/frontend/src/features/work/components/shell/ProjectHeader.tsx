"use client";

import { Settings } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { Project } from "../../types";
import { ProjectStatusBadge } from "../project/ProjectStatusBadge";

const MAX_AVATARS = 5;

interface ProjectHeaderProps {
  project: Project;
  onOpenSettings: () => void;
}

export function ProjectHeader({ project, onOpenSettings }: ProjectHeaderProps) {
  const visibleMembers = project.members.slice(0, MAX_AVATARS);
  const overflow = project.members.length - visibleMembers.length;

  return (
    <header className="flex items-center gap-3 border-b px-6 py-4">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-base font-semibold uppercase text-white",
        )}
        style={{ backgroundColor: project.color ?? "#475569" }}
        aria-hidden
      >
        {project.icon ?? project.slug.slice(0, 2)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-lg font-semibold leading-tight">
            {project.name}
          </h1>
          <ProjectStatusBadge status={project.status} />
          {project.archivedAt && (
            <span className="rounded-md border bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              Đã lưu trữ
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{project.slug}</span>
          <span>•</span>
          <span>
            Quản lý: {project.owner.name ?? project.owner.email}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {visibleMembers.map((m) => (
            <Avatar
              key={m.id}
              className="h-8 w-8 border-2 border-background"
              title={m.user.name ?? m.user.email}
            >
              {m.user.avatar && (
                <AvatarImage
                  src={m.user.avatar}
                  alt={m.user.name ?? m.user.email}
                />
              )}
              <AvatarFallback className="text-xs">
                {avatarInitials(m.user.name, m.user.email)}
              </AvatarFallback>
            </Avatar>
          ))}
          {overflow > 0 && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium text-muted-foreground">
              +{overflow}
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onOpenSettings}>
          <Settings className="mr-2 h-4 w-4" />
          Cài đặt
        </Button>
      </div>
    </header>
  );
}

function avatarInitials(name: string | null, email: string): string {
  const source = name && name.trim() ? name : email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}
