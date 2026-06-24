"use client";

import { Calendar } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { Project } from "../../types";

import { ProjectStatusBadge } from "./ProjectStatusBadge";

const MAX_AVATARS = 4;

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const visibleMembers = project.members.slice(0, MAX_AVATARS);
  const overflow = project.members.length - visibleMembers.length;
  const due = project.dueDate ? formatDate(project.dueDate) : null;

  return (
    <Link href={`/work/projects/${project.slug}`} className="block">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-semibold uppercase text-white",
              )}
              style={{
                backgroundColor: project.color ?? "#475569",
              }}
              aria-hidden
            >
              {project.icon ?? project.slug.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold leading-tight">
                {project.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {project.slug}
              </div>
            </div>
          </div>
          <ProjectStatusBadge status={project.status} />
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-2 pt-0">
          <div className="flex -space-x-2">
            {visibleMembers.map((m) => (
              <Avatar key={m.id} className="h-7 w-7 border-2 border-background">
                {m.user.avatar && (
                  <AvatarImage
                    src={m.user.avatar}
                    alt={m.user.name ?? m.user.email}
                  />
                )}
                <AvatarFallback className="text-[10px]">
                  {avatarInitials(m.user.name, m.user.email)}
                </AvatarFallback>
              </Avatar>
            ))}
            {overflow > 0 && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground">
                +{overflow}
              </div>
            )}
          </div>
          {due && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{due}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function avatarInitials(name: string | null, email: string): string {
  const source = name && name.trim() ? name : email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
