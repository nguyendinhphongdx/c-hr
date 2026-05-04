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
          Reporting line
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick an employee to walk the manager chain. Source of truth is the
          Department tree (Department.parentId + Department.managerId) — see
          ADR 0004. Department structure is browsable at{" "}
          <Link href="/departments" className="underline hover:no-underline">
            /departments
          </Link>
          .
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pick employee</CardTitle>
          <CardDescription>
            Lists active employees only — capped at 100 in this MVP picker.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={employeeId ?? ""}
            onValueChange={(v) => setEmployeeId(v || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose…" />
            </SelectTrigger>
            <SelectContent>
              {employees.data?.data.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} · {e.email}
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
              Chain for {focused.firstName} {focused.lastName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reporting.isLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Resolving…
              </div>
            ) : reporting.error ? (
              <p className="py-6 text-sm text-destructive">
                Couldn&apos;t resolve reporting line.
              </p>
            ) : !reporting.data?.length ? (
              <p className="py-6 text-sm text-muted-foreground">
                No managers in chain — this employee&apos;s department has no
                manager set, or they sit at the top of the tree.
              </p>
            ) : (
              <div className="space-y-2">
                <PersonCard label="You" employee={focused} highlight />
                {reporting.data.map((m, i) => (
                  <Step
                    key={m.id}
                    employee={m}
                    label={i === 0 ? "Direct manager" : `+${i} up`}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Visualization upgrade (interactive React Flow with zoom + drag) is
        deferred — this MVP renders the chain as a vertical list.
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
  employee: { firstName: string; lastName: string; email: string; title?: string | null };
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
          {employee.firstName} {employee.lastName}
        </span>
        <span className="text-xs text-muted-foreground">{employee.email}</span>
      </div>
      {employee.title && (
        <div className="mt-1 text-xs text-muted-foreground">{employee.title}</div>
      )}
    </div>
  );
}

