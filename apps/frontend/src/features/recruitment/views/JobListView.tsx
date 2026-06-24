"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { JobCreateDialog } from "../components/job/JobCreateDialog";
import { JobStatusBadge } from "../components/job/JobStatusBadge";
import { useJobs } from "../hooks/useJobs";
import type { JobStatus } from "../types";

const STATUS_FILTER_OPTIONS: Array<{ value: JobStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "DRAFT", label: "Bản nháp" },
  { value: "PUBLISHED", label: "Đang đăng" },
  { value: "PAUSED", label: "Tạm dừng" },
  { value: "CLOSED", label: "Đã đóng" },
  { value: "FILLED", label: "Đã tuyển đủ" },
];

export function JobListView() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<JobStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const jobsQuery = useJobs({
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    q: search.trim() || undefined,
  });

  const rows = jobsQuery.data ?? [];

  return (
    <PageContainer variant="bleed" className="h-full p-3!">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-background shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Tuyển dụng — Jobs
            </h1>
            <p className="text-xs text-muted-foreground">
              Quản lý vị trí tuyển dụng, pipeline ứng viên, push tin lên job board.
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Tạo job
          </Button>
        </div>

        <div className="flex items-center gap-2 border-b bg-muted/20 px-4 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tiêu đề / code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-72 pl-8 text-sm"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as JobStatus | "ALL")}
          >
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto text-xs text-muted-foreground">
            {jobsQuery.isLoading
              ? "Đang tải…"
              : `${rows.length} job${rows.length === 1 ? "" : ""}`}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {jobsQuery.error && (
            <p className="text-sm text-destructive">
              Lỗi: {(jobsQuery.error as Error).message}
            </p>
          )}

          {!jobsQuery.isLoading && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
              <p className="text-sm font-medium">Chưa có job nào</p>
              <p className="text-xs text-muted-foreground">
                Tạo job đầu tiên để bắt đầu pipeline tuyển dụng.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Tạo job
              </Button>
            </div>
          )}

          {rows.length > 0 && (
            <ul className="grid gap-2">
              {rows.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/hrm/recruitment/jobs/${job.slug}`}
                    className="block rounded-md border bg-background px-4 py-3 transition-colors hover:bg-accent/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {job.code}
                          </span>
                          <JobStatusBadge status={job.status} />
                          {job.isUrgent && (
                            <span className="inline-flex items-center rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                              Khẩn
                            </span>
                          )}
                        </div>
                        <h2 className="mt-0.5 truncate font-medium">
                          {job.title}
                        </h2>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {job.department?.name ?? "Chưa gán phòng ban"} ·{" "}
                          {job.workMode} ·{" "}
                          {job.workAddresses[0]?.city ?? "—"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {job._count.applications} ứng viên
                        </span>
                        <span>
                          {job.publishedAt
                            ? format(new Date(job.publishedAt), "dd/MM/yyyy", {
                                locale: vi,
                              })
                            : "Chưa đăng"}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <JobCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(slug) => router.push(`/hrm/recruitment/jobs/${slug}`)}
      />
    </PageContainer>
  );
}
