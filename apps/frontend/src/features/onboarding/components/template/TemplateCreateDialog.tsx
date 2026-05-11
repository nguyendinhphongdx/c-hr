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
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";

import { useCreateTemplate } from "../../hooks/useOnboardingTemplates";
import type { OnboardingTemplate } from "../../types";

const schema = z.object({
  name: z.string().min(1, "Bắt buộc").max(127),
  description: z.string().max(2000).optional(),
  isDefault: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface TemplateCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (template: OnboardingTemplate) => void;
}

export function TemplateCreateDialog({
  open,
  onClose,
  onCreated,
}: TemplateCreateDialogProps) {
  const createMut = useCreateTemplate();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", isDefault: false },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: "", description: "", isDefault: false });
    }
  }, [open, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const created = await createMut.mutateAsync({
        name: values.name,
        description: values.description || null,
        isDefault: values.isDefault,
      });
      toast.success("Đã tạo mẫu onboarding");
      onClose();
      onCreated?.(created);
    } catch (err) {
      toast.error("Không tạo được mẫu", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo mẫu onboarding</DialogTitle>
          <DialogDescription>
            Đặt tên rồi thêm công việc trong bước tiếp theo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên mẫu</FormLabel>
                  <FormControl>
                    <Input placeholder="VD: Dev mới, Sales mới" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả (tuỳ chọn)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Ghi chú nội bộ về cách dùng mẫu này"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex items-start justify-between gap-3 rounded-md border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Đặt làm mẫu mặc định</FormLabel>
                    <FormDescription>
                      Chỉ 1 mẫu mặc định mỗi tổ chức. Mẫu này sẽ áp tự động khi
                      tạo nhân viên mới (Phase 2).
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

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Tạo mẫu
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
