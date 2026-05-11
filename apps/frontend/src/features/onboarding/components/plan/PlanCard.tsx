"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import type { OnboardingPlanRow } from "../../types";

import { PlanProgressBar } from "./PlanProgressBar";
import { PlanStatusBadge } from "./PlanStatusBadge";

interface PlanCardProps {
  plan: OnboardingPlanRow;
}

export function PlanCard({ plan }: PlanCardProps) {
  const user = plan.employee.user;
  const dept = plan.employee.department;
  const total = plan.tasks.length;
  const done = plan.tasks.filter((t) => t.status === "DONE").length;

  return (
    <Link href={`/onboarding/${plan.id}`} className="block">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-10 w-10">
              {user?.avatar && (
                <AvatarImage src={user.avatar} alt={user.name ?? user.email} />
              )}
              <AvatarFallback className="text-xs">
                {avatarInitials(user?.name, user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold leading-tight">
                {user?.name ?? "(chưa có tên)"}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {plan.employee.code}
                {dept ? ` · ${dept.name}` : ""}
              </div>
            </div>
          </div>
          <PlanStatusBadge status={plan.status} />
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="truncate text-xs text-muted-foreground">
            Mẫu: {plan.templateNameSnapshot}
          </p>
          <PlanProgressBar done={done} total={total} size="sm" />
          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {plan.startedAt
                ? `Bắt đầu ${format(new Date(plan.startedAt), "dd/MM/yyyy", { locale: vi })}`
                : `Tạo ${format(new Date(plan.createdAt), "dd/MM/yyyy", { locale: vi })}`}
            </span>
            {plan.completedAt && (
              <span className="text-emerald-600 dark:text-emerald-400">
                Xong{" "}
                {format(new Date(plan.completedAt), "dd/MM/yyyy", {
                  locale: vi,
                })}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function avatarInitials(name: string | null | undefined, email?: string): string {
  const source = name && name.trim() ? name : email ?? "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}
