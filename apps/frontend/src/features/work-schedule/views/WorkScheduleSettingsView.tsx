"use client";

import { ArrowLeft, CalendarDays, Clock, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsAppAdmin } from "@/features/auth";
import { cn } from "@/lib/utils";

import {
  useCreateWorkSchedule,
  useDeleteWorkSchedule,
  useUpdateWorkSchedule,
  useWorkSchedules,
} from "../hooks/useWorkSchedules";
import type { AttendanceMode, ShiftInput, WorkSchedule } from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────

const ISO_DAYS = [
  { day: 1, label: "T2" },
  { day: 2, label: "T3" },
  { day: 3, label: "T4" },
  { day: 4, label: "T5" },
  { day: 5, label: "T6" },
  { day: 6, label: "T7" },
  { day: 7, label: "CN" },
];

const DAY_LABEL: Record<number, string> = { 1: "T2", 2: "T3", 3: "T4", 4: "T5", 5: "T6", 6: "T7", 7: "CN" };

// ── Helpers ───────────────────────────────────────────────────────────────────

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToHhmm(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** endTime for FLEXIBLE derived from startTime + hoursPerDay*60 + breakMinutes */
function deriveEndTime(startTime: string, hoursPerDay: number, breakMinutes: number): string {
  return minutesToHhmm(hhmmToMinutes(startTime) + Math.round(hoursPerDay * 60) + breakMinutes);
}

/** Required hours from FLEXIBLE endTime */
function deriveHoursPerDay(startTime: string, endTime: string, breakMinutes: number): number {
  const net = hhmmToMinutes(endTime) - hhmmToMinutes(startTime) - breakMinutes;
  return Math.max(0, Math.round((net / 60) * 10) / 10);
}

function formatDate(iso: string | null): string {
  if (!iso) return "Mặc định";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDayRanges(days: number[]): string {
  if (!days.length) return "—";
  const sorted = [...days].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur === prev + 1) {
      prev = cur;
    } else {
      ranges.push(start === prev ? DAY_LABEL[start] : `${DAY_LABEL[start]}–${DAY_LABEL[prev]}`);
      start = cur;
      prev = cur;
    }
  }
  return ranges.join(", ");
}

// ── Draft types ───────────────────────────────────────────────────────────────

interface DraftShift extends ShiftInput {
  _key: string;
  /** UI-only — FLEXIBLE: hours of net work required per day */
  _hoursPerDay: number;
}

let _keySeq = 1;
const makeKey = () => `s_${_keySeq++}`;

function defaultDraftShift(): DraftShift {
  return {
    _key: makeKey(),
    _hoursPerDay: 8,
    name: "Ca chính",
    startTime: "08:00",
    endTime: "17:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    breakMinutes: 60,
    crossesMidnight: false,
    mode: "FIXED",
    lateGraceMinutes: 15,
    windowMinutes: 60,
  };
}

function scheduleToDraft(s: WorkSchedule): {
  name: string;
  effectiveFrom: string;
  shifts: DraftShift[];
} {
  return {
    name: s.name,
    effectiveFrom: s.effectiveFrom ? s.effectiveFrom.slice(0, 10) : "",
    shifts: s.shifts.map((sh) => {
      const lateGrace =
        typeof sh.config.lateGraceMinutes === "number" ? sh.config.lateGraceMinutes : 15;
      const windowM =
        typeof sh.config.windowMinutes === "number" ? sh.config.windowMinutes : 60;
      return {
        _key: makeKey(),
        _hoursPerDay: deriveHoursPerDay(sh.startTime, sh.endTime, sh.breakMinutes),
        name: sh.name,
        startTime: sh.startTime,
        endTime: sh.endTime,
        daysOfWeek: [...sh.daysOfWeek],
        breakMinutes: sh.breakMinutes,
        crossesMidnight: sh.crossesMidnight,
        mode: sh.mode,
        lateGraceMinutes: lateGrace,
        windowMinutes: windowM,
      };
    }),
  };
}

function toShiftInput(s: DraftShift): ShiftInput {
  const endTime =
    s.mode === "FLEXIBLE"
      ? deriveEndTime(s.startTime, s._hoursPerDay, s.breakMinutes ?? 0)
      : s.endTime;
  const out: ShiftInput = {
    name: s.name,
    startTime: s.startTime,
    endTime,
    daysOfWeek: s.daysOfWeek,
    breakMinutes: s.breakMinutes,
    crossesMidnight: s.crossesMidnight,
    mode: s.mode,
  };
  if (s.mode === "FLEXIBLE") out.windowMinutes = s.windowMinutes ?? 60;
  else out.lateGraceMinutes = s.lateGraceMinutes ?? 15;
  return out;
}

// ── Mode toggle ───────────────────────────────────────────────────────────────

function ModeToggle({ value, onChange }: { value: AttendanceMode; onChange: (v: AttendanceMode) => void }) {
  return (
    <div className="inline-flex rounded-md border bg-muted p-0.5 gap-0.5">
      {(["FIXED", "FLEXIBLE"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            "rounded px-3 py-1 text-xs font-medium transition-colors",
            value === m
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {m === "FIXED" ? "Cố định" : "Linh hoạt"}
        </button>
      ))}
    </div>
  );
}

// ── Flexible preview ──────────────────────────────────────────────────────────

function FlexiblePreview({ shift }: { shift: DraftShift }) {
  const startM = hhmmToMinutes(shift.startTime || "08:00");
  const windowM = shift.windowMinutes ?? 60;
  const requiredM = Math.round(shift._hoursPerDay * 60);
  const breakM = shift.breakMinutes ?? 0;
  const earliestOut = startM + requiredM + breakM;
  const latestOut = startM + windowM + requiredM + breakM;
  return (
    <p className="text-xs text-muted-foreground">
      Vào {shift.startTime}–{minutesToHhmm(startM + windowM)} →
      về sớm nhất {minutesToHhmm(earliestOut)}, muộn nhất {minutesToHhmm(latestOut)}
    </p>
  );
}

// ── Schedule summary card (list view) ─────────────────────────────────────────

function ScheduleSummaryCard({
  schedule,
  onEdit,
}: {
  schedule: WorkSchedule;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card px-5 py-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-sm">{schedule.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {schedule.effectiveFrom
              ? `Hiệu lực từ ${formatDate(schedule.effectiveFrom)}`
              : "Lịch mặc định (baseline)"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit}>
          Sửa
        </Button>
      </div>

      {/* Shift list */}
      <ul className="space-y-2 border-t pt-3">
        {schedule.shifts.length === 0 && (
          <li className="text-xs text-muted-foreground">Chưa có ca nào</li>
        )}
        {schedule.shifts.map((sh) => {
          const isFlexible = sh.mode === "FLEXIBLE";
          const windowM =
            typeof sh.config.windowMinutes === "number" ? sh.config.windowMinutes : 60;
          const lateGrace =
            typeof sh.config.lateGraceMinutes === "number" ? sh.config.lateGraceMinutes : 15;
          const hoursPerDay = deriveHoursPerDay(sh.startTime, sh.endTime, sh.breakMinutes);
          return (
            <li key={sh.id} className="flex items-start gap-3 text-xs">
              <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="space-y-0.5">
                <span className="font-medium text-foreground">{sh.name}</span>
                <ul className="text-muted-foreground space-y-0.5 list-none pl-0">
                  <li>
                    <span className="text-foreground/60">Ngày:</span>{" "}
                    {formatDayRanges(sh.daysOfWeek)}
                  </li>
                  {isFlexible ? (
                    <>
                      <li>
                        <span className="text-foreground/60">Giờ vào:</span>{" "}
                        {sh.startTime}–{minutesToHhmm(hhmmToMinutes(sh.startTime) + windowM)}{" "}
                        <span className="text-muted-foreground/70">(cửa sổ {windowM} phút)</span>
                      </li>
                      <li>
                        <span className="text-foreground/60">Làm:</span>{" "}
                        {hoursPerDay}h/ngày
                        {sh.breakMinutes > 0 && ` · nghỉ ${sh.breakMinutes} phút`}
                      </li>
                      <li className="text-blue-600/80 dark:text-blue-400/80 font-medium">
                        Linh hoạt
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <span className="text-foreground/60">Giờ:</span>{" "}
                        {sh.startTime}–{sh.endTime}
                        {sh.breakMinutes > 0 && ` · nghỉ ${sh.breakMinutes} phút`}
                      </li>
                      {lateGrace > 0 && (
                        <li>
                          <span className="text-foreground/60">Cho phép trễ:</span>{" "}
                          {lateGrace} phút
                        </li>
                      )}
                    </>
                  )}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Shift edit card ───────────────────────────────────────────────────────────

function ShiftEditCard({
  shift,
  onChange,
  onRemove,
}: {
  shift: DraftShift;
  onChange: (patch: Partial<DraftShift>) => void;
  onRemove: () => void;
}) {
  const toggleDay = (day: number) => {
    const has = shift.daysOfWeek.includes(day);
    onChange({
      daysOfWeek: has
        ? shift.daysOfWeek.filter((d) => d !== day)
        : [...shift.daysOfWeek, day].sort((a, b) => a - b),
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Input
            value={shift.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="h-8 max-w-45 font-medium"
            aria-label="Tên ca"
          />
          <ModeToggle value={shift.mode ?? "FIXED"} onChange={(m) => onChange({ mode: m })} />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label="Xoá ca"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Day picker */}
        <div>
          <Label className="mb-2 block text-xs text-muted-foreground">Ngày trong tuần</Label>
          <div className="flex gap-1.5 flex-wrap">
            {ISO_DAYS.map(({ day, label }) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={cn(
                  "h-8 min-w-8 rounded border px-2 text-xs font-medium transition-colors",
                  shift.daysOfWeek.includes(day)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-accent",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Time fields — differ by mode */}
        {shift.mode === "FLEXIBLE" ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor={`start-${shift._key}`} className="text-xs text-muted-foreground">
                  Vào sớm nhất
                </Label>
                <Input
                  id={`start-${shift._key}`}
                  type="time"
                  value={shift.startTime}
                  onChange={(e) => onChange({ startTime: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`hours-${shift._key}`} className="text-xs text-muted-foreground">
                  Số giờ làm/ngày
                </Label>
                <div className="relative">
                  <Input
                    id={`hours-${shift._key}`}
                    type="number"
                    min={1}
                    max={24}
                    step={0.5}
                    value={shift._hoursPerDay}
                    onChange={(e) => onChange({ _hoursPerDay: Number(e.target.value) })}
                    className="pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    h
                  </span>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`break-${shift._key}`} className="text-xs text-muted-foreground">
                  Nghỉ giữa
                </Label>
                <div className="relative">
                  <Input
                    id={`break-${shift._key}`}
                    type="number"
                    min={0}
                    max={720}
                    value={shift.breakMinutes ?? 0}
                    onChange={(e) => onChange({ breakMinutes: Number(e.target.value) })}
                    className="pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    ph
                  </span>
                </div>
              </div>
            </div>
            <div className="rounded-md bg-muted/50 border px-4 py-3 space-y-2">
              <div className="grid gap-1.5 max-w-50">
                <Label htmlFor={`window-${shift._key}`} className="text-xs text-muted-foreground">
                  Khung giờ vào (phút)
                </Label>
                <Input
                  id={`window-${shift._key}`}
                  type="number"
                  min={0}
                  max={240}
                  value={shift.windowMinutes ?? 60}
                  onChange={(e) => onChange({ windowMinutes: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  Khoảng thời gian được phép check-in sau giờ vào sớm nhất.
                  Vào bất kỳ lúc nào trong cửa sổ đó, miễn làm đủ {shift._hoursPerDay}h.
                </p>
              </div>
              <FlexiblePreview shift={shift} />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor={`start-${shift._key}`} className="text-xs text-muted-foreground">
                  Bắt đầu
                </Label>
                <Input
                  id={`start-${shift._key}`}
                  type="time"
                  value={shift.startTime}
                  onChange={(e) => onChange({ startTime: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`end-${shift._key}`} className="text-xs text-muted-foreground">
                  Kết thúc
                </Label>
                <Input
                  id={`end-${shift._key}`}
                  type="time"
                  value={shift.endTime}
                  onChange={(e) => onChange({ endTime: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`break-${shift._key}`} className="text-xs text-muted-foreground">
                  Nghỉ giữa
                </Label>
                <div className="relative">
                  <Input
                    id={`break-${shift._key}`}
                    type="number"
                    min={0}
                    max={720}
                    value={shift.breakMinutes ?? 0}
                    onChange={(e) => onChange({ breakMinutes: Number(e.target.value) })}
                    className="pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    ph
                  </span>
                </div>
              </div>
            </div>
            <div className="grid gap-1.5 max-w-50">
              <Label htmlFor={`grace-${shift._key}`} className="text-xs text-muted-foreground">
                Cho phép trễ (phút)
              </Label>
              <Input
                id={`grace-${shift._key}`}
                type="number"
                min={0}
                max={120}
                value={shift.lateGraceMinutes ?? 15}
                onChange={(e) => onChange({ lateGraceMinutes: Number(e.target.value) })}
              />
            </div>
          </div>
        )}

        {/* Cross-midnight */}
        <div className="flex items-center gap-2">
          <Checkbox
            id={`midnight-${shift._key}`}
            checked={shift.crossesMidnight}
            onCheckedChange={(v) => onChange({ crossesMidnight: !!v })}
          />
          <Label htmlFor={`midnight-${shift._key}`} className="text-sm font-normal text-muted-foreground">
            Ca qua nửa đêm
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Edit form ─────────────────────────────────────────────────────────────────

function ScheduleEditForm({
  initial,
  onBack,
  onSaved,
  onDeleted,
  isNew,
}: {
  initial: { id?: string; name: string; effectiveFrom: string; shifts: DraftShift[] };
  onBack: () => void;
  onSaved: (id: string) => void;
  onDeleted: () => void;
  isNew: boolean;
}) {
  const create = useCreateWorkSchedule();
  const update = useUpdateWorkSchedule();
  const remove = useDeleteWorkSchedule();

  const [name, setName] = useState(initial.name);
  const [effectiveFrom, setEffectiveFrom] = useState(initial.effectiveFrom);
  const [shifts, setShifts] = useState<DraftShift[]>(initial.shifts);

  const updateShift = (key: string, patch: Partial<DraftShift>) =>
    setShifts((prev) => prev.map((s) => (s._key === key ? { ...s, ...patch } : s)));

  const onSave = async () => {
    if (shifts.length === 0) { toast.error("Cần ít nhất 1 ca"); return; }
    if (shifts.some((s) => s.daysOfWeek.length === 0)) { toast.error("Mỗi ca cần ít nhất 1 ngày"); return; }
    const payload = {
      name,
      effectiveFrom: effectiveFrom ? `${effectiveFrom}T00:00:00.000Z` : null,
      shifts: shifts.map(toShiftInput),
    };
    try {
      if (isNew) {
        const created = await create.mutateAsync(payload);
        toast.success("Đã tạo lịch");
        onSaved(created.id);
      } else {
        await update.mutateAsync({ id: initial.id!, data: payload });
        toast.success("Đã lưu");
        onSaved(initial.id!);
      }
    } catch (err) {
      toast.error("Lưu thất bại", { description: err instanceof Error ? err.message : undefined });
    }
  };

  const onDelete = async () => {
    if (!initial.id) return;
    try {
      await remove.mutateAsync(initial.id);
      toast.success("Đã xoá");
      onDeleted();
    } catch (err) {
      toast.error("Xoá thất bại", { description: err instanceof Error ? err.message : undefined });
    }
  };

  const saving = create.isPending || update.isPending;
  const deleting = remove.isPending;

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
        </Button>
        <div className="h-4 w-px bg-border" />
        <span className="text-sm font-medium">{isNew ? "Tạo lịch mới" : `Sửa: ${initial.name}`}</span>
        <div className="flex-1" />
        {!isNew && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={deleting}
            className="text-destructive hover:text-destructive gap-1.5"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Xoá lịch
          </Button>
        )}
        <Button onClick={onSave} disabled={saving} size="sm" className="gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Lưu
        </Button>
      </div>

      {/* Schedule meta */}
      <div className="grid sm:grid-cols-2 gap-4 max-w-lg">
        <div className="grid gap-1.5">
          <Label htmlFor="sched-name">Tên lịch</Label>
          <Input id="sched-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sched-from" className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /> Hiệu lực từ
          </Label>
          <Input
            id="sched-from"
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
          {!effectiveFrom && (
            <p className="text-xs text-muted-foreground -mt-1">Để trống = lịch mặc định</p>
          )}
        </div>
      </div>

      {/* Shift cards */}
      <div className="space-y-3">
        {shifts.map((shift) => (
          <ShiftEditCard
            key={shift._key}
            shift={shift}
            onChange={(patch) => updateShift(shift._key, patch)}
            onRemove={() => setShifts((prev) => prev.filter((s) => s._key !== shift._key))}
          />
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShifts((prev) => [...prev, { ...defaultDraftShift(), daysOfWeek: [] }])}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> Thêm ca
        </Button>
      </div>
    </div>
  );
}

// ── Root view ─────────────────────────────────────────────────────────────────

export function WorkScheduleSettingsView() {
  const canManage = useIsAppAdmin("HRM");
  const list = useWorkSchedules();
  const schedules = list.data ?? [];

  type ViewState =
    | { mode: "list" }
    | { mode: "edit"; id: string }
    | { mode: "new" };

  const [view, setView] = useState<ViewState>({ mode: "list" });

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        Chỉ HRM appadmin mới sửa được lịch chấm công.
      </p>
    );
  }

  if (list.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
      </div>
    );
  }

  // ── Edit / New form ──
  if (view.mode === "edit" || view.mode === "new") {
    const schedule =
      view.mode === "edit" ? (schedules.find((s) => s.id === view.id) ?? null) : null;
    const initial = schedule
      ? scheduleToDraft(schedule)
      : { name: "Lịch mới", effectiveFrom: "", shifts: [defaultDraftShift()] };

    return (
      <ScheduleEditForm
        initial={schedule ? { id: schedule.id, ...initial } : initial}
        isNew={view.mode === "new"}
        onBack={() => setView({ mode: "list" })}
        onSaved={() => setView({ mode: "list" })}
        onDeleted={() => setView({ mode: "list" })}
      />
    );
  }

  // ── List view ──
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Lịch làm việc ({schedules.length})
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setView({ mode: "new" })}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> Tạo lịch mới
        </Button>
      </div>

      {schedules.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Chưa có lịch nào. Tạo lịch đầu tiên để bắt đầu cấu hình chấm công.
        </p>
      )}

      {schedules.map((s) => (
        <ScheduleSummaryCard key={s.id} schedule={s} onEdit={() => setView({ mode: "edit", id: s.id })} />
      ))}
    </div>
  );
}
