"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDepartments } from "@/features/departments";

import { useHireApplication } from "../../hooks/useApplications";
import type { Application } from "../../types";

interface HireDialogProps {
  open: boolean;
  onClose: () => void;
  application: Application | null;
}

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function HireDialog({ open, onClose, application }: HireDialogProps) {
  const hire = useHireApplication();
  const departments = useDepartments();

  const [code, setCode] = useState("");
  const [hireDate, setHireDate] = useState(todayYmd());
  const [departmentId, setDepartmentId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [baseSalary, setBaseSalary] = useState("");

  useEffect(() => {
    if (open) {
      setCode("");
      setHireDate(todayYmd());
      setDepartmentId("");
      setTitle("");
      setBaseSalary("");
    }
  }, [open, application?.id]);

  if (!application) return null;

  const canSubmit = code.trim().length > 0;

  const handleSubmit = async () => {
    const salary = baseSalary === "" ? undefined : Number(baseSalary);
    await hire.mutateAsync({
      id: application.id,
      data: {
        code: code.trim(),
        hireDate: hireDate || undefined,
        departmentId: departmentId || undefined,
        title: title.trim() || undefined,
        baseSalary: Number.isFinite(salary) ? salary : undefined,
      },
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chuyển thành nhân viên</DialogTitle>
          <DialogDescription>
            Tạo Employee từ ứng viên <b>{application.candidate.fullName}</b>.
            HR có thể bổ sung BHXH / lương sau ở trang nhân sự.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-muted-foreground">
              Mã nhân viên *
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="EMP-0042"
              className="mt-1 font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Ngày vào làm</label>
            <Input
              type="date"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Phòng ban</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">(theo job)</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Chức danh</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="(theo job)"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">
              Lương cơ bản (VND)
            </label>
            <Input
              type="number"
              min={0}
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
              placeholder="(tuỳ chọn)"
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || hire.isPending}
            onClick={handleSubmit}
          >
            {hire.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Tạo nhân viên
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
