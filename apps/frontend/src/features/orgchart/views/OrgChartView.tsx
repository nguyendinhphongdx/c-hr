"use client";

import { ArrowDown, Loader2, Network } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmployees } from "@/features/employees";
import type { ID } from "@/lib/types";

import { useReportingLine } from "../hooks/useOrgChart";
import type { OrgChartEmployee } from "../types";

export function OrgChartView() {
  const employees = useEmployees({ status: "ACTIVE", limit: 100 });
  const [employeeId, setEmployeeId] = useState<ID | null>(null);
  const reporting = useReportingLine(employeeId);

  const focused = employees.data?.data.find((e) => e.id === employeeId);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Network className="h-5 w-5" />
          Cấp báo cáo
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chọn một nhân viên để xem chuỗi quản lý. Nguồn dữ liệu là cây phòng
          ban (Department.parentId + Department.managerId) — xem ADR 0004. Cấu
          trúc phòng ban xem ở{" "}
          <Link href="/departments" className="underline hover:no-underline">
            /departments
          </Link>
          .
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chọn nhân viên</CardTitle>
          <CardDescription>
            Chỉ liệt kê nhân viên đang làm — giới hạn 100 trong picker MVP này.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={employeeId ?? ""}
            onValueChange={(v) => setEmployeeId(v || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn…" />
            </SelectTrigger>
            <SelectContent>
              {employees.data?.data.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.user?.name ?? "(không tên)"} · {e.user?.email ?? "—"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {focused && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Chuỗi quản lý của {focused.user?.name ?? "(không tên)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reporting.isLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải…
              </div>
            ) : reporting.error ? (
              <p className="py-6 text-sm text-destructive">
                Không tải được cấp báo cáo.
              </p>
            ) : !reporting.data?.length ? (
              <p className="py-6 text-sm text-muted-foreground">
                Không có quản lý trong chuỗi — phòng ban của nhân viên này chưa
                gán quản lý, hoặc họ đứng ở đỉnh cây.
              </p>
            ) : (
              <div className="space-y-2">
                <PersonCard label="Bạn" employee={focused} highlight />
                {reporting.data.map((m, i) => (
                  <Step
                    key={m.id}
                    employee={m}
                    label={i === 0 ? "Quản lý trực tiếp" : `+${i} cấp trên`}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Bản nâng cấp trực quan (React Flow tương tác có zoom + kéo) đang được
        hoãn — MVP này render chuỗi dạng danh sách dọc.
      </p>
    </div>
  );
}

function Step({
  employee,
  label,
}: {
  employee: OrgChartEmployee;
  label: string;
}) {
  return (
    <>
      <div className="flex justify-center py-1 text-muted-foreground">
        <ArrowDown className="h-3.5 w-3.5" />
      </div>
      <PersonCard label={label} employee={employee} />
    </>
  );
}

function PersonCard({
  label,
  employee,
  highlight,
}: {
  label: string;
  employee: OrgChartEmployee;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-md border px-4 py-3 " +
        (highlight ? "border-primary/40 bg-primary/5" : "border-border")
      }
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">
          {employee.user?.name ?? "(không tên)"}
        </span>
        <span className="text-xs text-muted-foreground">
          {employee.user?.email ?? "—"}
        </span>
      </div>
      {employee.title && (
        <div className="mt-1 text-xs text-muted-foreground">{employee.title}</div>
      )}
    </div>
  );
}

