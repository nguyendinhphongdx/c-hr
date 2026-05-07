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
import { Textarea } from "@/components/ui/textarea";

import {
  useCreateResource,
  useUpdateResource,
} from "../../hooks/useResources";
import type { ResourceKind, ResourceRow } from "../../types";

const KIND_OPTIONS: { value: ResourceKind; label: string }[] = [
  { value: "ROOM", label: "Phòng họp" },
  { value: "EQUIPMENT", label: "Thiết bị" },
  { value: "VEHICLE", label: "Xe" },
];

const schema = z.object({
  kind: z.enum(["ROOM", "EQUIPMENT", "VEHICLE"]),
  name: z.string().min(1, "Bắt buộc").max(127),
  location: z.string().max(255).optional(),
  capacity: z.string().optional(),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Định dạng #RRGGBB")
    .optional()
    .or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  kind: "ROOM",
  name: "",
  location: "",
  capacity: "",
  description: "",
  color: "",
};

interface ResourceCreateDialogProps {
  open: boolean;
  onClose: () => void;
  /** When set, dialog edits this resource instead of creating new. */
  editing?: ResourceRow | null;
}

export function ResourceCreateDialog({
  open,
  onClose,
  editing,
}: ResourceCreateDialogProps) {
  const create = useCreateResource();
  const update = useUpdateResource();
  const submitting = create.isPending || update.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        kind: editing.kind,
        name: editing.name,
        location: editing.location ?? "",
        capacity: editing.capacity != null ? String(editing.capacity) : "",
        description: editing.description ?? "",
        color: editing.color ?? "",
      });
    } else {
      form.reset(EMPTY);
    }
  }, [open, editing, form]);

  const onSubmit = async (values: FormValues) => {
    const capacityNum = values.capacity ? Number(values.capacity) : undefined;
    if (capacityNum !== undefined && Number.isNaN(capacityNum)) {
      toast.error("Sức chứa phải là số");
      return;
    }
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          data: {
            kind: values.kind,
            name: values.name,
            location: values.location || null,
            capacity: capacityNum ?? null,
            description: values.description || null,
            color: values.color || null,
          },
        });
        toast.success("Đã cập nhật");
      } else {
        await create.mutateAsync({
          kind: values.kind,
          name: values.name,
          location: values.location || undefined,
          capacity: capacityNum,
          description: values.description || undefined,
          color: values.color || undefined,
        });
        toast.success("Đã thêm tài nguyên");
      }
      onClose();
    } catch (err) {
      toast.error(editing ? "Không cập nhật được" : "Không tạo được", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Sửa tài nguyên" : "Thêm tài nguyên"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Cập nhật thông tin tài nguyên."
              : "Tạo phòng họp / thiết bị / xe để dùng trong picker khi đặt lịch."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loại</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KIND_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên</FormLabel>
                  <FormControl>
                    <Input placeholder="Phòng họp A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vị trí</FormLabel>
                    <FormControl>
                      <Input placeholder="Tầng 3 — toà A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sức chứa</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="10"
                        className="w-24"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Màu nhãn</FormLabel>
                  <FormControl>
                    <Input placeholder="#3b82f6" {...field} />
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
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
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
