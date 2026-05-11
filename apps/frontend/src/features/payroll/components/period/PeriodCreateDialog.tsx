"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { useCreatePayrollPeriod } from "../../hooks/usePayrollPeriods";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  CURRENT_YEAR - 1,
  CURRENT_YEAR,
  CURRENT_YEAR + 1,
  CURRENT_YEAR + 2,
];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const schema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  note: z.string().max(1023).optional(),
});

type FormValues = z.infer<typeof schema>;

interface PeriodCreateDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PeriodCreateDialog({
  open,
  onClose,
}: PeriodCreateDialogProps) {
  const router = useRouter();
  const createMut = useCreatePayrollPeriod();
  const now = new Date();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      note: "",
    },
  });

  useEffect(() => {
    if (open) {
      const d = new Date();
      form.reset({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        note: "",
      });
    }
  }, [open, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const created = await createMut.mutateAsync({
        year: values.year,
        month: values.month,
        note: values.note?.trim() || undefined,
      });
      const skipped = created.meta?.skippedEmployees ?? [];
      if (skipped.length > 0) {
        const sample = skipped.slice(0, 5).join(", ");
        const more = skipped.length > 5 ? ` (+${skipped.length - 5})` : "";
        toast.warning(`Đã tạo kỳ lương`, {
          description: `${skipped.length} nhân viên bị bỏ qua vì chưa có lương cơ bản: ${sample}${more}.`,
        });
      } else {
        toast.success("Đã tạo kỳ lương");
      }
      onClose();
      router.push(`/payroll/${created.monthKey}`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Không tạo được kỳ lương";
      toast.error(msg);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo kỳ lương mới</DialogTitle>
          <DialogDescription>
            Chọn năm + tháng. Hệ thống tự lấy danh sách nhân viên đang làm
            việc và dữ liệu chấm công của tháng để khởi tạo bảng lương.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Năm</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {YEAR_OPTIONS.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tháng</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MONTHS.map((m) => (
                          <SelectItem key={m} value={String(m)}>
                            Tháng {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú (tuỳ chọn)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="VD: Lương tháng 5, bao gồm thưởng quý..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Tạo kỳ lương
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
