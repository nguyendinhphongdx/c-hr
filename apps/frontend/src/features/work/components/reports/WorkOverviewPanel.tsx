"use client";

import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  AlertTriangle,
  FolderKanban,
  ListTodo,
  Loader2,
  Lock,
  Users,
} from "lucide-react";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/card";
import { useIsAdmin, useIsAppAdmin } from "@/features/auth";

import { useOrgOverview } from "../../hooks/useReports";

import { KpiCard } from "./KpiCard";
import { WorkloadHeatmap } from "./WorkloadHeatmap";

/**
 * Báo cáo dự án — org-wide. Sidebar hides this for non-admin users, but
 * regular users who land here by URL still need a friendly 403 fallback.
 * BE re-enforces with `requireAppAdmin('HRM')`.
 */
export function WorkOverviewPanel() {
  const isAdmin = useIsAdmin();
  const isHrmAdmin = useIsAppAdmin("HRM");
  const allowed = isAdmin || isHrmAdmin;

  if (!allowed) {
    return (
      <PageContainer variant="default">
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <Lock className="h-8 w-8 text-muted-foreground" />
          <div className="text-lg font-medium">Không có quyền truy cập</div>
          <p className="text-sm text-muted-foreground">
            Báo cáo này chỉ hiển thị cho quản trị HRM.
          </p>
        </Card>
      </PageContainer>
    );
  }

  return <WorkOverviewContent />;
}

function WorkOverviewContent() {
  const { data, isLoading, error } = useOrgOverview();

  return (
    <PageContainer variant="wide">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Báo cáo dự án</h1>
          <p className="text-sm text-muted-foreground">
            Tổng quan toàn tổ chức — KPI, dự án nổi bật, khối lượng 14 ngày
            tới.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="py-12 text-center text-sm text-destructive">
          Không tải được báo cáo: {(error as Error).message}
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Chưa có dữ liệu báo cáo.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              icon={FolderKanban}
              label="Dự án đang chạy"
              value={String(data.totals.activeProjects)}
            />
            <KpiCard
              icon={ListTodo}
              label="Task đang mở"
              value={String(data.totals.openTasks)}
            />
            <KpiCard
              icon={AlertTriangle}
              label="Task quá hạn"
              value={String(data.totals.overdueTasks)}
              tone={data.totals.overdueTasks > 0 ? "warning" : "muted"}
            />
            <KpiCard
              icon={Users}
              label="Thành viên"
              value={String(data.totals.totalMembers)}
              hint="Số người có mặt trong các dự án"
            />
          </div>

          <Card className="p-4">
            <div className="mb-3">
              <div className="text-sm font-medium">Dự án nổi bật</div>
              <div className="text-xs text-muted-foreground">
                5 dự án có hoạt động gần đây nhất
              </div>
            </div>
            {data.topProjects.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Chưa có dự án nào.
              </div>
            ) : (
              <ul className="divide-y">
                {data.topProjects.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/projects/${p.slug}`}
                        className="truncate font-medium hover:underline"
                      >
                        {p.name}
                      </Link>
                      <div className="text-[10px] text-muted-foreground">
                        {p.slug} · cập nhật{" "}
                        {formatDistanceToNow(new Date(p.updatedAt), {
                          addSuffix: true,
                          locale: vi,
                        })}
                      </div>
                    </div>
                    <div className="shrink-0 text-right tabular-nums">
                      <div className="text-sm font-medium">{p.openCount}</div>
                      <div className="text-[10px] text-muted-foreground">
                        task đang mở
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <WorkloadHeatmap data={data.workloadHeatmap} />
        </>
      )}
    </PageContainer>
  );
}
