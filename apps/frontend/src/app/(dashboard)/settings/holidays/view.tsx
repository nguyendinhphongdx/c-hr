"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsAppAdmin } from "@/features/auth";
import {
  HolidayEditDialog,
  HolidayTable,
  useHolidays,
  type Holiday,
} from "@/features/holidays";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  CURRENT_YEAR - 1,
  CURRENT_YEAR,
  CURRENT_YEAR + 1,
  CURRENT_YEAR + 2,
];

export function HolidaysSettingsView() {
  const isHrmAdmin = useIsAppAdmin("HRM");
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);

  const list = useHolidays({ year });

  if (!isHrmAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ngày lễ</CardTitle>
          <CardDescription>
            Chỉ HRM admin mới quản lý được danh sách ngày lễ.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Liên hệ Org admin nếu bạn cần quyền chỉnh sửa.
        </CardContent>
      </Card>
    );
  }

  const onAdd = () => {
    setEditing(null);
    setOpen(true);
  };

  const onEdit = (h: Holiday) => {
    setEditing(h);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Ngày lễ</CardTitle>
            <CardDescription>
              HR khai báo các ngày lễ chính thức để hệ thống phân loại OT
              đúng hệ số (thường 1.5× / cuối tuần 2× / lễ 3×).
            </CardDescription>
          </div>
          <div className="flex items-end gap-3">
            <div className="w-32">
              <Label className="text-xs">Năm</Label>
              <Select
                value={String(year)}
                onValueChange={(v) => setYear(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={onAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Thêm ngày lễ
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {list.error ? (
            <p className="text-sm text-destructive">
              Không tải được danh sách.
            </p>
          ) : (
            <HolidayTable
              rows={list.data ?? []}
              loading={list.isLoading}
              year={year}
              onEdit={onEdit}
            />
          )}
        </CardContent>
      </Card>

      <HolidayEditDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
        editing={editing}
      />
    </div>
  );
}
