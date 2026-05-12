"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { useCreateHoliday, useUpdateHoliday } from "../hooks/useHolidays";
import type { Holiday } from "../types";

const schema = z.object({
  date: z
    .string()
    .min(1, "Bắt buộc")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng YYYY-MM-DD"),
  name: z.string().min(1, "Bắt buộc").max(127),
  isPaid: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  date: new Date().toISOString().slice(0, 10),
  name: "",
  isPaid: true,
};

interface HolidayEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Holiday | null;
}

export function HolidayEditDialog({
  open,
  onOpenChange,
  editing,
}: HolidayEditDialogProps) {
  const create = useCreateHoliday();
  const update = useUpdateHoliday();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        date: editing.date.slice(0, 10),
        name: editing.name,
        isPaid: editing.isPaid,
      });
    } else {
      form.reset(EMPTY);
    }
  }, [open, editing, form]);

  const submitting = create.isPending || update.isPending;

  const onSubmit = async (values: FormValues) => {
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          data: {
            date: values.date,
            name: values.name,
            isPaid: values.isPaid,
          },
        });
        toast.success("Đã cập nhật ngày lễ");
      } else {
        await create.mutateAsync({
          date: values.date,
          name: values.name,
          isPaid: values.isPaid,
        });
        toast.success("Đã thêm ngày lễ");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(editing ? "Không cập nhật được" : "Không tạo được", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Sửa ngày lễ" : "Thêm ngày lễ"}</DialogTitle>
          <DialogDescription>
            Ngày lễ ảnh hưởng đến cách phân loại OT (thường / cuối tuần /
            lễ). Mỗi ngày là 1 dòng — lễ kéo dài nhiều ngày tạo nhiều dòng.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ngày</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="VD: Tết Dương lịch, Quốc Khánh"
                      maxLength={127}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isPaid"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start justify-between gap-3 rounded-md border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Nghỉ có lương</FormLabel>
                    <FormDescription className="text-xs">
                      Tắt khi đây là ngày lễ kỷ niệm nội bộ — NLĐ đi làm tính
                      như ngày thường.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Huỷ
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                )}
                {editing ? "Lưu" : "Tạo"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
