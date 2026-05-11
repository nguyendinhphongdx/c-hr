"use client";

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

/**
 * Home page widget for the new hire — surfaces onboarding progress so
 * they don't need to discover `/my-onboarding` first.
 *
 * Hidden when there is no employee link, no plan, or the plan is no
 * longer active (COMPLETED / ARCHIVED).
 *
 * TODO (Phase 5+): show a 30-day post-completion celebration card
 * before hiding entirely; for MVP we hide as soon as the plan
 * transitions to COMPLETED.
 */
export function OnboardingCard() {
  const { user } = useAuth();
  const employeeId = user?.employeeId ?? null;
  const { plan, hasActivePlan, isLoading } = useMyOnboardingPlan(employeeId);

  if (!employeeId) return null;
  if (isLoading) return null;
  if (!plan || !hasActivePlan) return null;

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
