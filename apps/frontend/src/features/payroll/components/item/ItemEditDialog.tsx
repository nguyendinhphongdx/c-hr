"use client";

import { Download, Info, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ID } from "@/lib/types";

import {
  useRecomputePayrollItem,
  useUpdatePayrollItem,
} from "../../hooks/usePayrollItems";
import { usePayrollItem } from "../../hooks/usePayrollItems";
import { payrollItemService } from "../../services/itemService";
import type {
  AllowanceRow,
  DeductionRow,
  PayrollItemDetail,
  PayrollStatus,
  Region,
  UpdateItemInput,
} from "../../types";

import { AllowanceRowsEditor } from "./AllowanceRowsEditor";
import { DeductionRowsEditor } from "./DeductionRowsEditor";
import { formatVndCurrency, VndInput } from "./VndInput";

const REGION_OPTIONS: { value: Region; label: string }[] = [
  { value: "REGION_I", label: "Vùng I" },
  { value: "REGION_II", label: "Vùng II" },
  { value: "REGION_III", label: "Vùng III" },
  { value: "REGION_IV", label: "Vùng IV" },
];

interface ItemEditDialogProps {
  itemId: ID | null;
  onClose: () => void;
  periodStatus: PayrollStatus;
}

interface FormState {
  baseSalary: number;
  dependents: number;
  region: Region;
  standardWorkdays: number;
  actualWorkdays: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  otMinutesWeekday: number;
  otMinutesWeekend: number;
  otMinutesHoliday: number;
  allowancesJson: AllowanceRow[];
  deductionsJson: DeductionRow[];
  computeNote: string;
}

function toFormState(item: PayrollItemDetail): FormState {
  return {
    baseSalary: Number(item.baseSalary),
    dependents: item.dependents,
    region: item.region,
    standardWorkdays: item.standardWorkdays,
    actualWorkdays: Number(item.actualWorkdays),
    lateMinutes: item.lateMinutes,
    earlyLeaveMinutes: item.earlyLeaveMinutes,
    otMinutesWeekday: item.otMinutesWeekday,
    otMinutesWeekend: item.otMinutesWeekend,
    otMinutesHoliday: item.otMinutesHoliday,
    allowancesJson: item.allowancesJson ?? [],
    deductionsJson: item.deductionsJson ?? [],
    computeNote: item.computeNote ?? "",
  };
}

export function ItemEditDialog({
  itemId,
  onClose,
  periodStatus,
}: ItemEditDialogProps) {
  const open = itemId !== null;
  const { data: item, isLoading } = usePayrollItem(open ? itemId : null);
  const updateMut = useUpdatePayrollItem();
  const recomputeMut = useRecomputePayrollItem();

  const canEdit = periodStatus === "DRAFT";

  // React 19 pattern: derive form state in render by comparing the item
  // identity stamp. Reset to null when dialog closes (item becomes null).
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [exporting, setExporting] = useState(false);

  const stamp = item ? `${item.id}:${item.updatedAt}` : null;
  if (stamp && stamp !== hydratedFor) {
    setHydratedFor(stamp);
    setForm(toFormState(item!));
  }
  if (!open && (hydratedFor !== null || form !== null)) {
    setHydratedFor(null);
    setForm(null);
  }

  const onSave = async () => {
    if (!item || !form) return;
    const payload: UpdateItemInput = {
      baseSalary: form.baseSalary,
      dependents: form.dependents,
      region: form.region,
      standardWorkdays: form.standardWorkdays,
      actualWorkdays: form.actualWorkdays,
      lateMinutes: form.lateMinutes,
      earlyLeaveMinutes: form.earlyLeaveMinutes,
      otMinutesWeekday: form.otMinutesWeekday,
      otMinutesWeekend: form.otMinutesWeekend,
      otMinutesHoliday: form.otMinutesHoliday,
      allowancesJson: form.allowancesJson,
      deductionsJson: form.deductionsJson,
      computeNote: form.computeNote.trim() || null,
    };
    try {
      await updateMut.mutateAsync({ id: item.id, data: payload });
      toast.success("Đã lưu");
      onClose();
    } catch (err) {
      toast.error("Không lưu được", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
    }
  };

  const onRecompute = async () => {
    if (!item) return;
    try {
      await recomputeMut.mutateAsync(item.id);
      toast.success("Đã tính lại item");
    } catch (err) {
      toast.error("Không tính lại được", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
    }
  };

  const onDownloadPayslip = async () => {
    if (!item) return;
    setExporting(true);
    try {
      const blob = await payrollItemService.payslipXlsx(item.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payslip_${item.employee.code}_${item.period?.monthKey ?? "ky-luong"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Không tải được payslip", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
    } finally {
      setExporting(false);
    }
  };

  const employeeName =
    item?.employee.user?.name ?? item?.employee.user?.email ?? "—";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle className="text-base">
              {item ? (
                <>
                  <span className="font-mono text-sm text-muted-foreground">
                    {item.employee.code}
                  </span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  {employeeName}
                </>
              ) : (
                "Chi tiết bảng lương"
              )}
            </DialogTitle>
            <DialogDescription>
              {canEdit
                ? "Chỉnh sửa override lương cơ bản, công, OT, phụ cấp, khấu trừ. BE tự tính lại sau khi lưu."
                : `Kỳ lương đã ${periodStatus === "CLOSED" ? "đóng" : "trả"}, không thể chỉnh sửa.`}
            </DialogDescription>
          </DialogHeader>

          {isLoading || !item || !form ? (
            <div className="flex flex-1 items-center justify-center gap-2 px-6 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
            </div>
          ) : (
            <>
              {!canEdit && (
                <div className="mx-6 mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                  Kỳ lương đã {periodStatus === "CLOSED" ? "đóng" : "trả"},
                  mọi field chỉ ở chế độ xem.
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <Tabs defaultValue="basic">
                  <TabsList>
                    <TabsTrigger value="basic">Cơ bản</TabsTrigger>
                    <TabsTrigger value="work">Công + OT</TabsTrigger>
                    <TabsTrigger value="allowances">Phụ cấp</TabsTrigger>
                    <TabsTrigger value="deductions">Khấu trừ</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="mt-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Lương cơ bản (VND)</Label>
                        <VndInput
                          value={form.baseSalary}
                          onChange={(v) =>
                            setForm({ ...form, baseSalary: v })
                          }
                          disabled={!canEdit}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Override chỉ tác động đến kỳ này, không ghi về hồ sơ
                          nhân sự.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Số người phụ thuộc</Label>
                        <Input
                          type="number"
                          min={0}
                          disabled={!canEdit}
                          value={String(form.dependents)}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              dependents: Math.max(
                                0,
                                Number.parseInt(e.target.value, 10) || 0,
                              ),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Vùng lương tối thiểu</Label>
                        <Select
                          value={form.region}
                          onValueChange={(v) =>
                            setForm({ ...form, region: v as Region })
                          }
                          disabled={!canEdit}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {REGION_OPTIONS.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Ghi chú nội bộ</Label>
                      <Textarea
                        rows={2}
                        disabled={!canEdit}
                        placeholder="Lý do override, tham chiếu chứng từ..."
                        value={form.computeNote}
                        onChange={(e) =>
                          setForm({ ...form, computeNote: e.target.value })
                        }
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="work" className="mt-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Ngày công chuẩn</Label>
                        <Input
                          type="number"
                          min={0}
                          step="1"
                          disabled={!canEdit}
                          value={String(form.standardWorkdays)}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              standardWorkdays: Math.max(
                                0,
                                Number.parseInt(e.target.value, 10) || 0,
                              ),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Ngày công thực tế</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.5"
                          disabled={!canEdit}
                          value={String(form.actualWorkdays)}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              actualWorkdays: Math.max(
                                0,
                                Number.parseFloat(e.target.value) || 0,
                              ),
                            })
                          }
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Decimal — 0.5 = nửa ngày.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Đi muộn (phút)</Label>
                        <Input
                          type="number"
                          min={0}
                          disabled={!canEdit}
                          value={String(form.lateMinutes)}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              lateMinutes: Math.max(
                                0,
                                Number.parseInt(e.target.value, 10) || 0,
                              ),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Về sớm (phút)</Label>
                        <Input
                          type="number"
                          min={0}
                          disabled={!canEdit}
                          value={String(form.earlyLeaveMinutes)}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              earlyLeaveMinutes: Math.max(
                                0,
                                Number.parseInt(e.target.value, 10) || 0,
                              ),
                            })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        OT theo loại (phút)
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            Timesheet gộp toàn bộ OT vào ngày thường. Bạn
                            split theo loại để áp đúng hệ số (cuối tuần,
                            ngày lễ).
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Ngày thường</Label>
                          <Input
                            type="number"
                            min={0}
                            disabled={!canEdit}
                            value={String(form.otMinutesWeekday)}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                otMinutesWeekday: Math.max(
                                  0,
                                  Number.parseInt(e.target.value, 10) || 0,
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Cuối tuần</Label>
                          <Input
                            type="number"
                            min={0}
                            disabled={!canEdit}
                            value={String(form.otMinutesWeekend)}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                otMinutesWeekend: Math.max(
                                  0,
                                  Number.parseInt(e.target.value, 10) || 0,
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Ngày lễ</Label>
                          <Input
                            type="number"
                            min={0}
                            disabled={!canEdit}
                            value={String(form.otMinutesHoliday)}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                otMinutesHoliday: Math.max(
                                  0,
                                  Number.parseInt(e.target.value, 10) || 0,
                                ),
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="allowances" className="mt-4">
                    <AllowanceRowsEditor
                      value={form.allowancesJson}
                      onChange={(v) =>
                        setForm({ ...form, allowancesJson: v })
                      }
                      disabled={!canEdit}
                    />
                  </TabsContent>

                  <TabsContent value="deductions" className="mt-4">
                    <DeductionRowsEditor
                      value={form.deductionsJson}
                      onChange={(v) =>
                        setForm({ ...form, deductionsJson: v })
                      }
                      disabled={!canEdit}
                    />
                  </TabsContent>
                </Tabs>

                <ComputePreview item={item} />
              </div>

              <DialogFooter className="shrink-0 gap-2 border-t bg-background px-6 py-3">
                {canEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onRecompute}
                    disabled={recomputeMut.isPending || updateMut.isPending}
                  >
                    {recomputeMut.isPending ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Tính lại
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onDownloadPayslip}
                  disabled={exporting}
                >
                  {exporting ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Tải payslip
                </Button>
                <div className="flex-1" />
                <Button type="button" variant="ghost" onClick={onClose}>
                  {canEdit ? "Hủy" : "Đóng"}
                </Button>
                {canEdit && (
                  <Button
                    type="button"
                    onClick={onSave}
                    disabled={updateMut.isPending}
                  >
                    {updateMut.isPending && (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    )}
                    Lưu
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ComputePreview({ item }: { item: PayrollItemDetail }) {
  const rows: { label: string; value: string; emphasis?: boolean }[] = [
    { label: "Thu nhập gộp", value: formatVndCurrency(item.grossIncome) },
    {
      label: "Cơ sở đóng BH",
      value: formatVndCurrency(item.insurableBase),
    },
    {
      label: "Bảo hiểm NLĐ đóng",
      value: formatVndCurrency(item.insuranceTotal),
    },
    {
      label: "Thu nhập tính thuế",
      value: formatVndCurrency(item.taxableIncome),
    },
    { label: "Thuế TNCN", value: formatVndCurrency(item.taxAmount) },
    {
      label: "Thực nhận",
      value: formatVndCurrency(item.netPay),
      emphasis: true,
    },
  ];
  return (
    <div className="mt-6 rounded-md border bg-muted/30">
      <div className="border-b px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Kết quả tính (cập nhật sau khi Lưu / Tính lại)
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 text-sm md:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-muted-foreground">{r.label}</span>
            <span
              className={
                r.emphasis
                  ? "font-semibold tabular-nums"
                  : "tabular-nums text-foreground/80"
              }
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
