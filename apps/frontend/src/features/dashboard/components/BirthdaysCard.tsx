"use client";

import { Cake, UserPlus } from "lucide-react";
import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmployees } from "@/features/employees";
import type { Employee } from "@/features/employees";

const NEW_JOINER_DAYS = 14;
const BIRTHDAY_LOOKAHEAD_DAYS = 7;

interface UpcomingBirthday {
  employee: Employee;
  daysUntil: number;
  monthDay: string;
}

function daysUntilBirthday(dob: string, today: Date): number {
  const birth = new Date(dob);
  const next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    next.setFullYear(today.getFullYear() + 1);
  }
  return Math.round((next.getTime() - today.setHours(0, 0, 0, 0)) / 86_400_000);
}

function formatBirthdayLabel(daysUntil: number, monthDay: string): string {
  if (daysUntil === 0) return "Hôm nay 🎉";
  if (daysUntil === 1) return "Ngày mai";
  return `${monthDay} (còn ${daysUntil} ngày)`;
}

export function BirthdaysCard() {
  const list = useEmployees({ status: "ACTIVE", limit: 500 });

  const { birthdays, joiners } = useMemo(() => {
    const today = new Date();
    const employees = list.data?.data ?? [];

    const bdays: UpcomingBirthday[] = [];
    for (const emp of employees) {
      const dob = emp.user?.dob;
      if (!dob) continue;
      const days = daysUntilBirthday(dob, new Date(today));
      if (days > BIRTHDAY_LOOKAHEAD_DAYS) continue;
      const date = new Date(dob);
      const monthDay = `${String(date.getDate()).padStart(2, "0")}/${String(
        date.getMonth() + 1,
      ).padStart(2, "0")}`;
      bdays.push({ employee: emp, daysUntil: days, monthDay });
    }
    bdays.sort((a, b) => a.daysUntil - b.daysUntil);

    const cutoff = today.getTime() - NEW_JOINER_DAYS * 86_400_000;
    const newJoiners = employees
      .filter((e) => e.hireDate && new Date(e.hireDate).getTime() >= cutoff)
      .sort(
        (a, b) =>
          new Date(b.hireDate ?? 0).getTime() - new Date(a.hireDate ?? 0).getTime(),
      )
      .slice(0, 5);

    return { birthdays: bdays, joiners: newJoiners };
  }, [list.data]);

  if (list.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Đồng đội</CardTitle>
        </CardHeader>
        <CardContent className="h-32 animate-pulse rounded bg-muted/40" />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Đồng đội</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <section>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Cake className="h-3.5 w-3.5" /> Sinh nhật tuần này
          </div>
          {birthdays.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">Không có ai trong 7 ngày tới.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {birthdays.map(({ employee, daysUntil, monthDay }) => (
                <li
                  key={employee.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate font-medium">
                    {employee.user?.name ?? "(không tên)"}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatBirthdayLabel(daysUntil, monthDay)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <UserPlus className="h-3.5 w-3.5" /> Mới gia nhập (14 ngày qua)
          </div>
          {joiners.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Chưa có nhân sự mới gần đây.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {joiners.map((emp) => (
                <li
                  key={emp.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate font-medium">
                    {emp.user?.name ?? "(không tên)"}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {emp.title ?? emp.code}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
