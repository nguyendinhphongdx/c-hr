"use client";

import { Loader2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsAppAdmin } from "@/features/auth";

import { useEmployees } from "../hooks/useEmployees";
import type { EmployeeStatus } from "../types";

const PAGE_SIZE = 20;

const STATUSES: { value: EmployeeStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "ON_LEAVE", label: "On leave" },
  { value: "TERMINATED", label: "Terminated" },
];

const statusVariant: Record<EmployeeStatus, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  ON_LEAVE: "secondary",
  TERMINATED: "outline",
};

export function EmployeeListView() {
  const canManage = useIsAppAdmin("HRM");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<EmployeeStatus | "all">("all");
  const [page, setPage] = useState(1);

  const list = useEmployees({
    q: q.trim() || undefined,
    status: status === "all" ? undefined : status,
    page,
    limit: PAGE_SIZE,
  });

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            HR records — search, filter, and (HRM admin) manage.
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/employees/new" className="gap-2">
              <Plus className="h-4 w-4" />
              New employee
            </Link>
          </Button>
        )}
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or code"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as EmployeeStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="md:w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-background">
        {list.isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading employees…
          </div>
        ) : list.error ? (
          <p className="p-6 text-sm text-destructive">
            Couldn&apos;t load employees.
          </p>
        ) : !list.data?.data.length ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No employees match the current filters.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.data.data.map((emp) => (
                <tr
                  key={emp.id}
                  className="cursor-pointer transition-colors hover:bg-accent/30"
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link
                      href={`/employees/${emp.id}`}
                      className="block w-full"
                    >
                      {emp.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/employees/${emp.id}`}
                      className="block w-full font-medium"
                    >
                      {emp.firstName} {emp.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {emp.email}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {emp.title ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[emp.status]}>
                      {emp.status.replace("_", " ").toLowerCase()}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {list.data && list.data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, list.data.total)} of {list.data.total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span>
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
