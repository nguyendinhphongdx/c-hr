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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RichTextDescriptionField } from "@/features/calendar/components/event/RichTextDescriptionField";
import { UserPicker } from "@/features/users";
import type { OrgUser } from "@/features/users";
import type { ID } from "@/lib/types";

import { useAddPlanTask } from "../../hooks/useOnboardingPlans";

const schema = z.object({
  title: z.string().min(1, "Bắt buộc").max(255),
  description: z.string().optional(),
  assigneeUserId: z.string().uuid("Chọn người nhận"),
  dueDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface TaskAddDialogProps {
  planId: ID;
  open: boolean;
  onClose: () => void;
}

export function TaskAddDialog({ planId, open, onClose }: TaskAddDialogProps) {
  const addMut = useAddPlanTask();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      assigneeUserId: "",
      dueDate: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: "",
        description: "",
        assigneeUserId: "",
        dueDate: "",
      });
    }
  }, [open, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await addMut.mutateAsync({
        planId,
        data: {
          title: values.title,
          description: values.description || null,
          assigneeUserId: values.assigneeUserId,
          dueDate: values.dueDate || null,
        },
      });
      toast.success("Đã thêm nhiệm vụ");
      onClose();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ??
        (err instanceof Error ? err.message : "Không thêm được");
      toast.error(msg);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm nhiệm vụ</DialogTitle>
          <DialogDescription>
            Nhiệm vụ thêm sẽ được xếp cuối danh sách.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tiêu đề</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="VD: Cấp tài khoản email"
                      {...field}
                    />
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
                    <RichTextDescriptionField
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Mô tả chi tiết nhiệm vụ…"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assigneeUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Người nhận</FormLabel>
                  <FormControl>
                    <UserPicker
                      value={field.value || null}
                      onChange={(u: OrgUser | null) =>
                        field.onChange(u?.id ?? "")
                      }
                      placeholder="Chọn người nhận"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hạn chót (tuỳ chọn)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit" disabled={addMut.isPending}>
                {addMut.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Thêm nhiệm vụ
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
