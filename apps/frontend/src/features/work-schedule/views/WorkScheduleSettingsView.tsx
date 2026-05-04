"use client";

import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsAppAdmin } from "@/features/auth";
import { cn } from "@/lib/utils";

import {
  useCreateWorkSchedule,
  useUpdateWorkSchedule,
  useWorkSchedules,
} from "../hooks/useWorkSchedules";
import type { ShiftInput, WorkSchedule } from "../types";

const ISO_DAYS = [
  { day: 1, label: "T2" },
  { day: 2, label: "T3" },
  { day: 3, label: "T4" },
  { day: 4, label: "T5" },
  { day: 5, label: "T6" },
  { day: 6, label: "T7" },
  { day: 7, label: "CN" },
];

interface DraftShift extends ShiftInput {
  key: string;
}

let nextKey = 1;
function makeKey() {
  return `s_${nextKey++}`;
}

function fromSchedule(s: WorkSchedule | null): {
  name: string;
  shifts: DraftShift[];
} {
  if (!s) {
    return {
      name: "Lịch chuẩn 5.5 ngày",
      shifts: [
        {
          key: makeKey(),
          name: "Ca chính",
          startTime: "08:00",
          endTime: "17:00",
          daysOfWeek: [1, 2, 3, 4, 5],
          breakMinutes: 60,
          lateGraceMinutes: 15,
          crossesMidnight: false,
        },
      ],
    };
  }
  return {
    name: s.name,
    shifts: s.shifts.map((sh) => ({
      key: makeKey(),
      name: sh.name,
      startTime: sh.startTime,
      endTime: sh.endTime,
      daysOfWeek: [...sh.daysOfWeek],
      breakMinutes: sh.breakMinutes,
      lateGraceMinutes: sh.lateGraceMinutes,
      crossesMidnight: sh.crossesMidnight,
    })),
  };
}

export function WorkScheduleSettingsView() {
  const canManage = useIsAppAdmin("HRM");
  const list = useWorkSchedules();
  const create = useCreateWorkSchedule();
  const update = useUpdateWorkSchedule();

  // Pick the existing default; falls back to first row, else null (=> create new).
  const current = (list.data ?? []).find((s) => s.isDefault) ?? list.data?.[0] ?? null;

  const [name, setName] = useState("");
  const [shifts, setShifts] = useState<DraftShift[]>([]);

  useEffect(() => {
    if (!list.isLoading) {
      const init = fromSchedule(current ?? null);
      setName(init.name);
      setShifts(init.shifts);
    }
  }, [list.isLoading, current]);

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        Only HRM appadmins can edit the work schedule.
      </p>
    );
  }

  const updateShift = (key: string, patch: Partial<DraftShift>) => {
    setShifts((prev) =>
      prev.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    );
  };

  const toggleDay = (key: string, day: number) => {
    setShifts((prev) =>
      prev.map((s) => {
        if (s.key !== key) return s;
        const has = s.daysOfWeek.includes(day);
        return {
          ...s,
          daysOfWeek: has
            ? s.daysOfWeek.filter((d) => d !== day)
            : [...s.daysOfWeek, day].sort((a, b) => a - b),
        };
      }),
    );
  };

  const removeShift = (key: string) => {
    setShifts((prev) => prev.filter((s) => s.key !== key));
  };

  const addShift = () => {
    setShifts((prev) => [
      ...prev,
      {
        key: makeKey(),
        name: "Ca mới",
        startTime: "08:00",
        endTime: "17:00",
        daysOfWeek: [],
        breakMinutes: 0,
        lateGraceMinutes: 15,
        crossesMidnight: false,
      },
    ]);
  };

  const onSave = async () => {
    if (shifts.length === 0) {
      toast.error("Cần ít nhất 1 ca");
      return;
    }
    if (shifts.some((s) => s.daysOfWeek.length === 0)) {
      toast.error("Mỗi ca cần ít nhất 1 ngày");
      return;
    }
    const payload = {
      name,
      isDefault: true,
      shifts: shifts.map(({ key: _key, ...rest }) => rest),
    };

    try {
      if (current) {
        await update.mutateAsync({ id: current.id, data: payload });
      } else {
        await create.mutateAsync(payload);
      }
      toast.success("Đã lưu lịch làm việc");
    } catch (err) {
      toast.error("Lưu thất bại", {
        description:
          err instanceof Error ? err.message : "Kiểm tra trùng ngày giữa các ca.",
      });
    }
  };

  const saving = update.isPending || create.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Work schedule</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Lịch chuẩn của Org. Mỗi ca gắn với 1 set ngày trong tuần — không
          trùng giữa các ca.
        </p>
      </div>

      {list.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schedule</CardTitle>
              <CardDescription>
                {current ? "Updating the default schedule." : "Creating the default schedule."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 max-w-sm">
                <Label htmlFor="schedule-name">Tên</Label>
                <Input
                  id="schedule-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {shifts.map((shift) => (
              <Card key={shift.key}>
                <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                  <div className="grid gap-2 flex-1 max-w-sm">
                    <Label htmlFor={`name-${shift.key}`}>Tên ca</Label>
                    <Input
                      id={`name-${shift.key}`}
                      value={shift.name}
                      onChange={(e) => updateShift(shift.key, { name: e.target.value })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeShift(shift.key)}
                    aria-label="Remove shift"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Ngày trong tuần</Label>
                    <div className="flex gap-2 flex-wrap">
                      {ISO_DAYS.map(({ day, label }) => {
                        const active = shift.daysOfWeek.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(shift.key, day)}
                            className={cn(
                              "h-9 min-w-9 rounded-md border px-2 text-xs font-medium transition-colors",
                              active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:bg-accent",
                            )}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor={`start-${shift.key}`}>Bắt đầu</Label>
                      <Input
                        id={`start-${shift.key}`}
                        type="time"
                        value={shift.startTime}
                        onChange={(e) => updateShift(shift.key, { startTime: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`end-${shift.key}`}>Kết thúc</Label>
                      <Input
                        id={`end-${shift.key}`}
                        type="time"
                        value={shift.endTime}
                        onChange={(e) => updateShift(shift.key, { endTime: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="grid gap-2">
                      <Label htmlFor={`break-${shift.key}`}>Nghỉ giữa (phút)</Label>
                      <Input
                        id={`break-${shift.key}`}
                        type="number"
                        min={0}
                        max={720}
                        value={shift.breakMinutes ?? 0}
                        onChange={(e) =>
                          updateShift(shift.key, {
                            breakMinutes: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`grace-${shift.key}`}>Cho phép trễ (phút)</Label>
                      <Input
                        id={`grace-${shift.key}`}
                        type="number"
                        min={0}
                        max={120}
                        value={shift.lateGraceMinutes ?? 15}
                        onChange={(e) =>
                          updateShift(shift.key, {
                            lateGraceMinutes: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <Checkbox
                        id={`midnight-${shift.key}`}
                        checked={shift.crossesMidnight}
                        onCheckedChange={(v) =>
                          updateShift(shift.key, { crossesMidnight: !!v })
                        }
                      />
                      <Label
                        htmlFor={`midnight-${shift.key}`}
                        className="text-sm font-normal"
                      >
                        Qua nửa đêm
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" onClick={addShift} className="gap-2">
              <Plus className="h-4 w-4" /> Thêm ca
            </Button>
          </div>

          <div className="flex justify-end">
            <Button onClick={onSave} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Lưu
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
