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
  FormDescription,
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
import { EmployeePicker } from "@/features/employees";

import { useTemplates } from "../../hooks/useOnboardingTemplates";
import { useCreatePlan } from "../../hooks/useOnboardingPlans";

const schema = z.object({
  employeeId: z.string().uuid("Chọn nhân sự"),
  templateId: z.string().uuid("Chọn mẫu"),
});

type FormValues = z.infer<typeof schema>;

interface PlanCreateDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PlanCreateDialog({ open, onClose }: PlanCreateDialogProps) {
  const router = useRouter();
  const createMut = useCreatePlan();
  const templatesQ = useTemplates({ active: "true" });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { employeeId: "", templateId: "" },
  });

  useEffect(() => {
    if (open) form.reset({ employeeId: "", templateId: "" });
  }, [open, form]);

  const templates = templatesQ.data ?? [];

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const created = await createMut.mutateAsync(values);
      toast.success("Đã tạo kế hoạch onboarding");
      onClose();
      router.push(`/onboarding/${created.id}`);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ??
        (err instanceof Error ? err.message : "Không tạo được kế hoạch");
      toast.error(msg);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo kế hoạch onboarding</DialogTitle>
          <DialogDescription>
            Thường khi tạo nhân viên mới, hệ thống tự sinh plan từ mẫu mặc định.
            Form này dành cho HR khi cần tạo thủ công.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nhân sự</FormLabel>
                  <FormControl>
                    <EmployeePicker
                      value={field.value || null}
                      onChange={(v) => field.onChange(v ?? "")}
                      placeholder="Chọn nhân sự đang hoạt động"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mẫu onboarding</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={templatesQ.isLoading || templates.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            templatesQ.isLoading
                              ? "Đang tải mẫu…"
                              : templates.length === 0
                                ? "Chưa có mẫu nào đang dùng"
                                : "Chọn mẫu"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                          {t.isDefault ? " (mặc định)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {templates.length === 0 && !templatesQ.isLoading && (
                    <FormDescription>
                      Tạo mẫu trước tại /settings/onboarding.
                    </FormDescription>
                  )}
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
                Tạo kế hoạch
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
