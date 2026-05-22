"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Loader2,
  MapPin,
  Plus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ApplyDialog } from "../components/application/ApplyDialog";
import { HireDialog } from "../components/application/HireDialog";
import { JobPostingsTab } from "../components/application/JobPostingsTab";
import { PipelineBoard } from "../components/application/PipelineBoard";
import { JobStatusBadge } from "../components/job/JobStatusBadge";
import { useJob, useJobTransition } from "../hooks/useJobs";
import type { Application } from "../types";

interface JobDetailViewProps {
  slug: string;
}

function formatSalary(
  min: string | null,
  max: string | null,
  currency: string,
): string {
  if (!min && !max) return "Thoả thuận";
  const fmt = (v: string) => Number(v).toLocaleString("vi-VN");
  if (min && max) return `${fmt(min)} – ${fmt(max)} ${currency}`;
  return `${fmt(min ?? max!)} ${currency}`;
}

export function JobDetailView({ slug }: JobDetailViewProps) {
  const jobQuery = useJob(slug);
  const transition = useJobTransition();
  const [applyOpen, setApplyOpen] = useState(false);
  const [hireTarget, setHireTarget] = useState<Application | null>(null);

  if (jobQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
      </div>
    );
  }
  if (jobQuery.error || !jobQuery.data) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        {jobQuery.error
          ? `Lỗi: ${(jobQuery.error as Error).message}`
          : "Không tìm thấy job"}
      </div>
    );
  }

  const job = jobQuery.data;
  const canEdit = job.view?.canEdit ?? false;
  const stages = [...job.stages].sort((a, b) => a.order - b.order);
  const pipelineStages = stages.filter((s) => s.kind !== "REJECTED");
  const rejectedStage = stages.find((s) => s.kind === "REJECTED");
  const orderedStages = rejectedStage
    ? [...pipelineStages, rejectedStage]
    : pipelineStages;

  return (
    <PageContainer variant="bleed" className="h-full p-3!">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-background shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <Link
              href="/recruitment/jobs"
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Quay lại danh sách
            </Link>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">
                {job.code}
              </span>
              <JobStatusBadge status={job.status} />
            </div>
            <h1 className="mt-0.5 text-lg font-semibold leading-tight">
              {job.title}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {job.jobType} · {job.workMode}
              </span>
              {job.workAddresses[0] && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {job.workAddresses[0].city}
                </span>
              )}
              {job.department && <span>· {job.department.name}</span>}
              <span>
                {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {job._count.applications} ứng viên / {job.headcount} headcount
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {canEdit && (
              <Button size="sm" onClick={() => setApplyOpen(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Thêm ứng viên
              </Button>
            )}
            {canEdit &&
              (job.status === "DRAFT" || job.status === "PAUSED") && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={transition.isPending}
                  onClick={() =>
                    transition.mutate({ id: job.id, action: "publish" })
                  }
                >
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  Đăng tin
                </Button>
              )}
            {canEdit && job.status === "PUBLISHED" && (
              <Button
                size="sm"
                variant="outline"
                disabled={transition.isPending}
                onClick={() =>
                  transition.mutate({ id: job.id, action: "pause" })
                }
              >
                Tạm dừng
              </Button>
            )}
            {canEdit && job.status !== "CLOSED" && (
              <Button
                size="sm"
                variant="ghost"
                disabled={transition.isPending}
                onClick={() =>
                  transition.mutate({ id: job.id, action: "close" })
                }
              >
                Đóng job
              </Button>
            )}
          </div>
        </div>

        <Tabs
          defaultValue="pipeline"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <TabsList className="mx-4 mt-3 w-fit">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="postings">Đăng tin</TabsTrigger>
            <TabsTrigger value="info">Thông tin</TabsTrigger>
          </TabsList>

          <TabsContent
            value="pipeline"
            className="flex-1 overflow-hidden p-0"
          >
            <PipelineBoard
              jobId={job.id}
              stages={orderedStages}
              onHireApplication={(app) => setHireTarget(app)}
            />
          </TabsContent>

          <TabsContent
            value="postings"
            className="flex-1 overflow-y-auto p-6"
          >
            <JobPostingsTab jobId={job.id} canPush={canEdit} />
          </TabsContent>

          <TabsContent value="info" className="flex-1 overflow-y-auto p-6">
            <article className="prose prose-sm dark:prose-invert max-w-3xl space-y-5">
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Mô tả
                </h3>
                <p className="whitespace-pre-wrap">{job.description}</p>
              </section>
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Yêu cầu
                </h3>
                <p className="whitespace-pre-wrap">{job.requirements}</p>
              </section>
              {job.benefits && (
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Phúc lợi
                  </h3>
                  <p className="whitespace-pre-wrap">{job.benefits}</p>
                </section>
              )}
              {job.requiredSkills.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Kỹ năng yêu cầu
                  </h3>
                  <ul className="flex flex-wrap gap-1.5 not-prose">
                    {job.requiredSkills.map((s) => (
                      <li
                        key={s}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section className="text-xs text-muted-foreground">
                Tạo bởi {job.createdBy.name ?? job.createdBy.email} lúc{" "}
                {format(new Date(job.createdAt), "HH:mm dd/MM/yyyy", {
                  locale: vi,
                })}
                {job.publishedAt && (
                  <>
                    {" · "}đăng lúc{" "}
                    {format(new Date(job.publishedAt), "HH:mm dd/MM/yyyy", {
                      locale: vi,
                    })}
                  </>
                )}
              </section>
            </article>
          </TabsContent>
        </Tabs>
      </div>

      <ApplyDialog
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        jobId={job.id}
      />

      <HireDialog
        open={!!hireTarget}
        onClose={() => setHireTarget(null)}
        application={hireTarget}
      />
    </PageContainer>
  );
}
