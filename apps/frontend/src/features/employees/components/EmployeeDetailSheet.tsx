"use client";

import {
  Building2,
  Cake,
  CalendarDays,
  CalendarOff,
  Loader2,
  Mail,
  Phone,
  User2,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useDepartments } from "@/features/departments";
import type { ID } from "@/lib/types";

import { useEmployee } from "../hooks/useEmployees";
import type { EmployeeStatus } from "../types";

interface EmployeeDetailSheetProps {
  id: ID | null;
  onClose: () => void;
}

const statusVariant: Record<EmployeeStatus, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  ON_LEAVE: "secondary",
  TERMINATED: "outline",
};

const genderLabel: Record<string, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function initials(name: string | null | undefined, fallback: string): string {
  const source = name?.trim() || fallback;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function EmployeeDetailSheet({ id, onClose }: EmployeeDetailSheetProps) {
  const employee = useEmployee(id);
  const departments = useDepartments();

  const e = employee.data;
  const fullName = e?.user?.name ?? "(không tên)";
  const dept = e?.departmentId
    ? departments.data?.find((d) => d.id === e.departmentId)
    : null;
  const deptLabel = dept ? `${dept.name}${dept.code ? ` · ${dept.code}` : ""}` : "—";

  return (
    <Sheet open={!!id} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl">
        {employee.isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải…
          </div>
        ) : !e ? (
          <div className="flex h-full items-center justify-center text-sm text-destructive">
            Không tìm thấy nhân sự.
          </div>
        ) : (
          <>
            <div className="bg-muted/40 px-6 pb-6 pt-8">
              <SheetHeader className="space-y-0 px-0 sm:text-left">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 border bg-background">
                    <AvatarImage src={e.user?.avatar ?? undefined} alt={fullName} />
                    <AvatarFallback className="text-lg font-medium">
                      {initials(e.user?.name, e.code)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <SheetTitle className="truncate text-xl">{fullName}</SheetTitle>
                    <SheetDescription className="text-sm">
                      {e.title ?? "Chưa đặt chức danh"}
                    </SheetDescription>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="rounded-md bg-background px-2 py-0.5 font-mono text-xs">
                        {e.code}
                      </span>
                      <Badge variant={statusVariant[e.status]}>
                        {e.status.replace("_", " ").toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              </SheetHeader>
            </div>

            <div className="space-y-6 px-6 py-6">
              <Section title="Liên hệ">
                <FieldRow icon={<Mail className="h-3.5 w-3.5" />} label="Email">
                  {e.user?.email ? (
                    <a
                      href={`mailto:${e.user.email}`}
                      className="font-mono text-sm text-foreground hover:underline"
                    >
                      {e.user.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </FieldRow>
                <FieldRow icon={<Phone className="h-3.5 w-3.5" />} label="Số điện thoại">
                  {e.user?.phone ? (
                    <a
                      href={`tel:${e.user.phone}`}
                      className="text-sm text-foreground hover:underline"
                    >
                      {e.user.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </FieldRow>
              </Section>

              <Separator />

              <Section title="Cá nhân">
                <FieldRow icon={<User2 className="h-3.5 w-3.5" />} label="Giới tính">
                  {e.user?.gender ? genderLabel[e.user.gender] : "—"}
                </FieldRow>
                <FieldRow
                  icon={<Cake className="h-3.5 w-3.5" />}
                  label="Ngày sinh"
                >
                  {formatDate(e.user?.dob)}
                </FieldRow>
              </Section>

              <Separator />

              <Section title="Công việc">
                <FieldRow
                  icon={<Building2 className="h-3.5 w-3.5" />}
                  label="Phòng ban"
                >
                  {deptLabel}
                </FieldRow>
                <FieldRow
                  icon={<CalendarDays className="h-3.5 w-3.5" />}
                  label="Ngày vào"
                >
                  {formatDate(e.hireDate)}
                </FieldRow>
                {e.terminationDate && (
                  <FieldRow
                    icon={<CalendarOff className="h-3.5 w-3.5" />}
                    label="Ngày nghỉ"
                  >
                    {formatDate(e.terminationDate)}
                  </FieldRow>
                )}
              </Section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <dl className="space-y-2.5">{children}</dl>
    </div>
  );
}

function FieldRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[24px_120px_1fr] items-center gap-2">
      <div className="text-muted-foreground">{icon}</div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}
