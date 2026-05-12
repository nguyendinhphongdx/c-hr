"use client";

import { differenceInDays, format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/features/auth";
import {
  PlanProgressBar,
  PlanStatusBadge,
  useMyOnboardingPlan,
} from "@/features/onboarding";

const CELEBRATION_WINDOW_DAYS = 30;

/**
 * Home page widget for the new hire — surfaces onboarding progress so
 * they don't need to discover `/my-onboarding` first.
 *
 * Variants:
 *  - active (PENDING / IN_PROGRESS) → progress card
 *  - completed within last 30 days → emerald celebration card
 *  - otherwise (no plan, archived, or >30d since completion) → hidden
 */
export function OnboardingCard() {
  const { user } = useAuth();
  const employeeId = user?.employeeId ?? null;
  const { plan, hasActivePlan, isLoading } = useMyOnboardingPlan(employeeId);

  if (!employeeId) return null;
  if (isLoading) return null;
  if (!plan) return null;

  if (!hasActivePlan) {
    if (
      plan.status === "COMPLETED" &&
      plan.completedAt &&
      differenceInDays(new Date(), parseISO(plan.completedAt)) <=
        CELEBRATION_WINDOW_DAYS
    ) {
      return (
        <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/40">
          <CardContent className="flex items-start justify-between gap-3 pt-6">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                🎉 Chúc mừng! Bạn đã hoàn thành onboarding
              </p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                Hoàn thành ngày{" "}
                {format(parseISO(plan.completedAt), "dd/MM/yyyy", {
                  locale: vi,
                })}
              </p>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1 text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
            >
              <Link href="/my-onboarding">
                Xem lại <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  const total = plan.tasks.length;
  const done = plan.tasks.filter((t) => t.status === "DONE").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            Onboarding
            <PlanStatusBadge status={plan.status} />
          </span>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link href="/my-onboarding">
              Xem chi tiết <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="text-lg font-semibold tabular-nums">
            {done}
            <span className="text-sm text-muted-foreground"> / {total}</span>{" "}
            <span className="text-xs text-muted-foreground">nhiệm vụ</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {plan.templateNameSnapshot}
          </p>
        </div>
        <PlanProgressBar done={done} total={total} size="md" hideLabel />
      </CardContent>
    </Card>
  );
}
