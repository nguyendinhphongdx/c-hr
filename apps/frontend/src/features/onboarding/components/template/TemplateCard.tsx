"use client";

import { CheckCircle2, ListChecks, Star } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { OnboardingTemplate } from "../../types";

interface TemplateCardProps {
  template: OnboardingTemplate;
  onClick: (template: OnboardingTemplate) => void;
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  const taskCount = template._count?.tasks ?? template.tasks.length;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onClick(template)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(template);
        }
      }}
      className={cn(
        "cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring",
        !template.isActive && "opacity-60",
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="truncate">{template.name}</span>
            {template.isDefault && (
              <Star
                className="h-4 w-4 fill-amber-400 text-amber-400"
                aria-label="Mẫu mặc định"
              />
            )}
          </CardTitle>
          {template.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {stripHtml(template.description)}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2 pt-0 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <ListChecks className="h-3.5 w-3.5" />
          {taskCount} công việc
        </span>
        {template.isActive ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Đang dùng
          </span>
        ) : (
          <span>Đã lưu trữ</span>
        )}
      </CardContent>
    </Card>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
