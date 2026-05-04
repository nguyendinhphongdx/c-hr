"use client";

import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useIsAppAdmin } from "@/features/auth";
import { useDepartments } from "@/features/departments";
import type { ID } from "@/lib/types";

import { useEmployee } from "../hooks/useEmployees";

interface EmployeeDetailViewProps {
  id: ID;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function EmployeeDetailView({ id }: EmployeeDetailViewProps) {
  const canManage = useIsAppAdmin("HRM");
  const employee = useEmployee(id);
  const departments = useDepartments();

  if (employee.isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (employee.error || !employee.data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm text-destructive">Employee not found.</p>
        <Button variant="ghost" asChild className="mt-4 gap-2">
          <Link href="/employees">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to list
          </Link>
        </Button>
      </div>
    );
  }

  const e = employee.data;
  const fullName = e.user?.name ?? "(no name)";
  const dept = e.departmentId
    ? departments.data?.find((d) => d.id === e.departmentId)
    : null;
  const deptLabel = dept ? `${dept.name}${dept.code ? ` · ${dept.code}` : ""}` : "—";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8">
      <Button variant="ghost" asChild size="sm" className="gap-2">
        <Link href="/employees">
          <ArrowLeft className="h-3.5 w-3.5" /> All employees
        </Link>
      </Button>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-2xl">{fullName}</CardTitle>
            <CardDescription>
              {e.title ?? "No title set"} · <span className="font-mono">{e.code}</span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{e.status.replace("_", " ").toLowerCase()}</Badge>
            {canManage && (
              <Button asChild size="sm" variant="outline" className="gap-2">
                <Link href={`/employees/${e.id}/edit`}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field label="Email" value={e.user?.email ?? "—"} mono />
          <Field label="Phone" value={e.user?.phone ?? "—"} />
          <Field label="Date of birth" value={formatDate(e.user?.dob ?? null)} />
          <Field label="Gender" value={e.user?.gender ?? "—"} />
          <Field label="Hire date" value={formatDate(e.hireDate)} />
          {e.terminationDate && (
            <Field
              label="Termination date"
              value={formatDate(e.terminationDate)}
            />
          )}
          <Field label="Department" value={deptLabel} />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  small,
}: {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div
        className={[
          "text-sm",
          mono ? "font-mono" : "",
          small ? "text-xs" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </div>
    </div>
  );
}
