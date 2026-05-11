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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextDescriptionField } from "@/features/calendar/components/event/RichTextDescriptionField";
import { TagPicker } from "@/features/tags";
import { UserPicker } from "@/features/users/components/UserPicker";
import type { ID } from "@/lib/types";

import { useCreateTask } from "../../hooks/useTasks";
import { useProjectMembers } from "../../hooks/useProjects";
import type { TaskPriority } from "../../types";

const schema = z.object({
  title: z.string().min(1, "Bắt buộc").max(255),
  description: z.string().optional(),
  sectionId: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  dueDate: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof schema>;

interface TaskCreateDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: ID;
  /** Pre-select a section (used by the "+" button per section). */
  defaultSectionId?: ID | null;
  /** Available sections for select. */
  sections: { id: ID; name: string }[];
}

export function TaskCreateDialog({
  open,
  onClose,
  projectId,
  defaultSectionId,
  sections,
}: TaskCreateDialogProps) {
  const create = useCreateTask();
  const members = useProjectMembers(projectId);
  const memberUserIds = (members.data ?? []).map((m) => m.userId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      sectionId: defaultSectionId ?? sections[0]?.id ?? undefined,
      assigneeId: undefined,
      priority: "MEDIUM",
      dueDate: "",
      tagIds: [],
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: "",
        description: "",
        sectionId: defaultSectionId ?? sections[0]?.id ?? undefined,
        assigneeId: undefined,
        priority: "MEDIUM",
        dueDate: "",
        tagIds: [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultSectionId]);

  const onSubmit = async (values: FormValues) => {
    try {
      await create.mutateAsync({
        projectId,
        title: values.title,
        description: values.description || undefined,
        sectionId: values.sectionId || undefined,
        assigneeId: values.assigneeId || undefined,
        priority: values.priority,
        dueDate: values.dueDate || undefined,
        tagIds:
          values.tagIds && values.tagIds.length > 0 ? values.tagIds : undefined,
      });
      toast.success("Đã tạo task");
      onClose();
    } catch (err) {
      toast.error("Không tạo được task", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
    }
  };

  const submitting = create.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Tạo task mới</DialogTitle>
          <DialogDescription>
            Điền thông tin task — bạn có thể bổ sung mô tả, người làm và tag.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tiêu đề</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Viết tài liệu kiến trúc"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sectionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nhóm</FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(v) =>
                          field.onChange(v === "__none__" ? undefined : v)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn nhóm…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Không có nhóm</SelectItem>
                          {sections.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
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
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Độ ưu tiên</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) =>
                          field.onChange(v as TaskPriority)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LOW">Thấp</SelectItem>
                          <SelectItem value="MEDIUM">Trung bình</SelectItem>
                          <SelectItem value="HIGH">Cao</SelectItem>
                          <SelectItem value="URGENT">Khẩn</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Người làm</FormLabel>
                      <FormControl>
                        <UserPicker
                          value={field.value ?? null}
                          onChange={(u) => field.onChange(u?.id ?? undefined)}
                          placeholder="Chọn thành viên dự án…"
                          filter={(u) =>
                            memberUserIds.length === 0 ||
                            memberUserIds.includes(u.id)
                          }
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
                      <FormLabel>Hạn chót</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="tagIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tag</FormLabel>
                    <FormControl>
                      <TagPicker
                        value={field.value ?? []}
                        onChange={field.onChange}
                        scope="null"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-2">
                <FormLabel>Mô tả</FormLabel>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <RichTextDescriptionField
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      disabled={submitting}
                    />
                  )}
                />
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-background px-6 py-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Huỷ
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                )}
                Tạo
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
