"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  usePayrollConfig,
  useUpdatePayrollConfig,
} from "../../hooks/usePayrollConfig";
import type {
  OtRates,
  PayrollConfig,
  RegionMinWage,
  TaxBracket,
  UpdateConfigInput,
} from "../../types";
import { OtRatesEditor } from "./OtRatesEditor";
import { RegionMinWageEditor } from "./RegionMinWageEditor";
import { TaxBracketsEditor } from "./TaxBracketsEditor";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

interface FormState {
  personalDeduction: number;
  dependentDeduction: number;
  regionMinWageJson: RegionMinWage;
  insuranceCapMultiplier: number;
  bhxhRate: number;
  bhytRate: number;
  bhtnRate: number;
  otRatesJson: OtRates;
  taxBracketsJson: TaxBracket[];
}

function toFormState(c: PayrollConfig): FormState {
  return {
    personalDeduction: Number(c.personalDeduction),
    dependentDeduction: Number(c.dependentDeduction),
    regionMinWageJson: c.regionMinWageJson,
    insuranceCapMultiplier: Number(c.insuranceCapMultiplier),
    bhxhRate: Number(c.bhxhRate),
    bhytRate: Number(c.bhytRate),
    bhtnRate: Number(c.bhtnRate),
    otRatesJson: c.otRatesJson,
    taxBracketsJson: c.taxBracketsJson,
  };
}

export function PayrollConfigForm() {
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const config = usePayrollConfig(year);
  const update = useUpdatePayrollConfig();

  // Hydrate form state from the latest server snapshot. Tracking the
  // source row's `updatedAt` as a key resets local edits whenever a fresh
  // config arrives (year change, post-save invalidate) without needing a
  // setState-in-effect — the React 19 pattern from the official docs.
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const stamp = config.data ? `${config.data.id}:${config.data.updatedAt}` : null;
  if (stamp && stamp !== hydratedFor) {
    setHydratedFor(stamp);
    setForm(toFormState(config.data!));
  }

  const onSave = async () => {
    if (!form) return;
    const payload: UpdateConfigInput = {
      personalDeduction: form.personalDeduction,
      dependentDeduction: form.dependentDeduction,
      regionMinWageJson: form.regionMinWageJson,
      insuranceCapMultiplier: form.insuranceCapMultiplier,
      bhxhRate: form.bhxhRate,
      bhytRate: form.bhytRate,
      bhtnRate: form.bhtnRate,
      otRatesJson: form.otRatesJson,
      taxBracketsJson: form.taxBracketsJson,
    };
    try {
      await update.mutateAsync({ year, data: payload });
      toast.success(`Đã lưu cấu hình lương năm ${year}`);
    } catch (err) {
      toast.error("Không lưu được", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Cấu hình lương</CardTitle>
            <CardDescription>
              Mức giảm trừ, hệ số trần BH, bậc thuế TNCN — chọn năm áp dụng. Lần
              đầu mở năm mới sẽ tự seed mặc định theo luật VN 2024.
            </CardDescription>
          </div>
          <div className="w-40">
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
        </CardHeader>
      </Card>

      {config.isLoading || !form ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Giảm trừ gia cảnh</CardTitle>
              <CardDescription>
                Áp khi tính thu nhập chịu thuế TNCN — số tiền VND/tháng.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <NumberField
                label="Giảm trừ bản thân"
                value={form.personalDeduction}
                onChange={(v) =>
                  setForm({ ...form, personalDeduction: v })
                }
              />
              <NumberField
                label="Giảm trừ / người phụ thuộc"
                value={form.dependentDeduction}
                onChange={(v) =>
                  setForm({ ...form, dependentDeduction: v })
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lương tối thiểu vùng</CardTitle>
              <CardDescription>
                Dùng để tính trần đóng BHXH/BHYT/BHTN (= hệ số × mức tối
                thiểu vùng).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RegionMinWageEditor
                value={form.regionMinWageJson}
                onChange={(v) =>
                  setForm({ ...form, regionMinWageJson: v })
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bảo hiểm bắt buộc (phần NLĐ đóng)</CardTitle>
              <CardDescription>
                Tỷ lệ % NLĐ chịu. Mặc định BHXH 8% / BHYT 1.5% / BHTN 1%. Hệ
                số trần áp dụng cho mọi loại BH.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <NumberField
                label="Hệ số trần (× tối thiểu vùng)"
                value={form.insuranceCapMultiplier}
                onChange={(v) =>
                  setForm({ ...form, insuranceCapMultiplier: v })
                }
                step="0.5"
              />
              <NumberField
                label="BHXH (%)"
                value={form.bhxhRate}
                onChange={(v) => setForm({ ...form, bhxhRate: v })}
                step="0.1"
              />
              <NumberField
                label="BHYT (%)"
                value={form.bhytRate}
                onChange={(v) => setForm({ ...form, bhytRate: v })}
                step="0.1"
              />
              <NumberField
                label="BHTN (%)"
                value={form.bhtnRate}
                onChange={(v) => setForm({ ...form, bhtnRate: v })}
                step="0.1"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hệ số làm thêm giờ</CardTitle>
              <CardDescription>
                Nhân vào lương giờ chuẩn. Luật quy định tối thiểu 1.5/2.0/3.0
                tương ứng ngày thường / cuối tuần / lễ Tết.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OtRatesEditor
                value={form.otRatesJson}
                onChange={(v) => setForm({ ...form, otRatesJson: v })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bậc thuế TNCN lũy tiến</CardTitle>
              <CardDescription>
                7 bậc theo luật VN. <em>Đến mức</em> sắp xếp tăng dần — bậc
                cuối cùng để trống nghĩa là vô cực.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaxBracketsEditor
                value={form.taxBracketsJson}
                onChange={(v) => setForm({ ...form, taxBracketsJson: v })}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={onSave}
              disabled={update.isPending}
              className="gap-2"
            >
              {update.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Lưu cấu hình {year}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
}

function NumberField({ label, value, onChange, step }: NumberFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        step={step ?? "1"}
        min={0}
        value={String(value)}
        onChange={(e) => {
          const num = Number.parseFloat(e.target.value);
          onChange(Number.isFinite(num) ? num : 0);
        }}
      />
    </div>
  );
}
