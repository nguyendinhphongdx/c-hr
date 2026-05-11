"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ID } from "@/lib/types";

import {
  useCreateTag,
  useDeleteTag,
  useTags,
  useUpdateTag,
} from "../hooks/useTags";
import type { Tag } from "../types";
import { TagBadge } from "./TagBadge";

const schema = z.object({
  name: z.string().min(1, "Bắt buộc").max(63),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Định dạng #RRGGBB"),
  scope: z.string().max(31).optional(),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = { name: "", color: "#3b82f6", scope: "" };

export function TagLibraryAdmin() {
  const list = useTags();
  const create = useCreateTag();
  const update = useUpdateTag();
  const remove = useDeleteTag();

  const [editing, setEditing] = useState<Tag | null>(null);
  const [open, setOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        name: editing.name,
        color: editing.color,
        scope: editing.scope ?? "",
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
            name: values.name,
            color: values.color,
            scope: values.scope ? values.scope : null,
          },
        });
        toast.success("Đã cập nhật tag");
      } else {
        await create.mutateAsync({
          name: values.name,
          color: values.color,
          scope: values.scope || undefined,
        });
        toast.success("Đã tạo tag");
      }
      setOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(editing ? "Không cập nhật được" : "Không tạo được", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const onDelete = async (id: ID, name: string) => {
    if (!confirm(`Xoá tag "${name}"? Mọi gán hiện tại sẽ bị huỷ.`)) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Đã xoá tag");
    } catch (err) {
      toast.error("Không xoá được", {
        description: err instanceof Error ? err.message : "Thử lại sau.",
      });
    }
  };

  const onAdd = () => {
    setEditing(null);
    setOpen(true);
  };

  const onEdit = (tag: Tag) => {
    setEditing(tag);
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Thư viện tag</CardTitle>
          <CardDescription>
            Tag dùng chung cho mọi đối tượng (nhân viên, sự kiện, công việc…).
            Chỉ HRM admin mới sửa được.
          </CardDescription>
        </div>
        <Button onClick={onAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Thêm tag
        </Button>
      </CardHeader>
      <CardContent>
        {list.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải…
          </div>
        ) : list.error ? (
          <p className="text-sm text-destructive">Không tải được danh sách.</p>
        ) : !list.data?.length ? (
          <p className="text-sm text-muted-foreground">
            Chưa có tag nào. Bấm “Thêm tag” để tạo cái đầu tiên.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag</TableHead>
                <TableHead className="w-32">Màu</TableHead>
                <TableHead className="w-32">Phạm vi</TableHead>
                <TableHead className="w-24 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <TagBadge tag={t} />
                  </TableCell>
                  <TableCell>
                    <code className="text-xs text-muted-foreground">
                      {t.color}
                    </code>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t.scope ?? "Tất cả"}
                  </TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(t)}
                      aria-label="Sửa"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(t.id, t.name)}
                      disabled={remove.isPending}
                      aria-label="Xoá"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            setOpen(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa tag" : "Thêm tag"}</DialogTitle>
            <DialogDescription>
              Đặt tên ngắn gọn (≤ 63 ký tự) và một mã màu để phân biệt nhanh.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên</FormLabel>
                    <FormControl>
                      <Input placeholder="VD: urgent" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Màu</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={field.value}
                          onChange={field.onChange}
                          className="h-9 w-14 p-1"
                        />
                        <Input
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="#3b82f6"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phạm vi (tuỳ chọn)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: Task — để trống = áp dụng mọi loại"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    setEditing(null);
                  }}
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
    </Card>
  );
}
