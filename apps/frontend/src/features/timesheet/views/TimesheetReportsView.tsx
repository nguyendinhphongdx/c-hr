"use client";

import { endOfMonth, startOfMonth } from "date-fns";
import { Download, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDepartments } from "@/features/departments";

import { EmployeeReportDrawer } from "../components/EmployeeReportDrawer";
import { EmployeeSummaryTable } from "../components/EmployeeSummaryTable";
import { MonthRangePicker } from "../components/MonthRangePicker";
import { TimesheetOverviewPanel } from "../components/TimesheetOverviewPanel";
import {
  useTimesheetOverview,
  useTimesheetSummary,
} from "../hooks/useTimesheetReport";
import { timesheetReportService } from "../services/reportService";
import type { EmployeeSummaryRow } from "../types/report";

const DEPT_ALL = "__all__";

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultRange() {
  const now = new Date();
  return {
    from: toYmd(startOfMonth(now)),
    to: toYmd(endOfMonth(now)),
  };
}

/**
 * Báo cáo Thời gian làm việc — org-wide aggregate report. Two tabs:
 *
 * - "Theo nhân sự" — list of every active employee × their period
 *   metrics (workdays, late, early-leave, absent, OT, attendance rate).
 *   Feed into payroll.
 * - "Tổng quan" — KPI cards + trend chart + top lists (Phase 5).
 *
 * Permission: HRM appadmin / admin / sysowner. Sidebar already hides
 * the menu for regular users; BE re-enforces via `requireAppAdmin`.
 */
export function TimesheetReportsView() {
  const [range, setRange] = useState(defaultRange);
  const [departmentId, setDepartmentId] = useState<string>(DEPT_ALL);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [selectedRow, setSelectedRow] = useState<EmployeeSummaryRow | null>(null);

  const departments = useDepartments();

  const summaryQuery = useMemo(
    () => ({
      from: range.from,
      to: range.to,
      ...(departmentId !== DEPT_ALL ? { departmentId } : {}),
      ...(search.trim() ? { q: search.trim() } : {}),
    }),
    [range, departmentId, search],
  );
  const { data: rows, isLoading, error: summaryError } =
    useTimesheetSummary(summaryQuery);
  const overview = useTimesheetOverview(summaryQuery);

  const onExport = async () => {
    setExporting(true);
    try {
      const blob = await timesheetReportService.summaryXlsx(summaryQuery);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bao-cao-cham-cong_${range.from}_${range.to}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Không xuất được Excel", {
        description:
          err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageContainer variant="bleed" className="h-full p-3!">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-background shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Báo cáo Thời gian làm việc
            </h1>
            <p className="text-xs text-muted-foreground">
              Tổng hợp dữ liệu chấm công — phục vụ tính công, tính lương.
            </p>
          </div>
          <MonthRangePicker
            from={range.from}
            to={range.to}
            onChange={setRange}
          />
        </div>

        <Tabs defaultValue="employees" className="flex flex-1 flex-col">
          <div className="border-b bg-muted/20 px-4 py-2">
            <TabsList>
              <TabsTrigger value="employees">Theo nhân sự</TabsTrigger>
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="employees"
            className="flex flex-1 flex-col gap-3 overflow-hidden p-4"
          >
            <div className="flex items-center gap-2">
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Phòng ban" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEPT_ALL}>Tất cả phòng ban</SelectItem>
                  {(departments.data ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo mã / tên / email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-72 pl-7 text-sm"
                />
              </div>

              <div className="ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onExport}
                  disabled={exporting || isLoading || (rows?.length ?? 0) === 0}
                >
                  {exporting ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-3.5 w-3.5" />
                  )}
                  Xuất Excel
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {summaryError ? (
                <div className="py-16 text-center text-sm text-destructive">
                  Lỗi: {(summaryError as Error).message}
                </div>
              ) : (
                <EmployeeSummaryTable
                  rows={rows ?? []}
                  loading={isLoading}
                  onRowClick={setSelectedRow}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="overview" className="overflow-auto p-4">
            <TimesheetOverviewPanel
              data={overview.data}
              loading={overview.isLoading}
            />
          </TabsContent>
        </Tabs>
      </div>

      <EmployeeReportDrawer
        range={range}
        row={selectedRow}
        onClose={() => setSelectedRow(null)}
      />
    </PageContainer>
  );
}
