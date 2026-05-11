"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserPicker, type OrgUser } from "@/features/users";
import type { ID } from "@/lib/types";

import { useCreateProject } from "../../hooks/useProjects";
import type { ProjectVisibility } from "../../types";

const SLUG_RE = /^[A-Z0-9]{3,8}$/;

const schema = z.object({
  name: z.string().min(1, "Bắt buộc").max(127),
  slug: z
    .string()
    .max(8)
    .optional()
    .refine((v) => !v || SLUG_RE.test(v), {
      message: "Slug 3-8 ký tự, chỉ A-Z và 0-9",
    }),
  description: z.string().optional(),
  color: z.string().optional(),
  visibility: z.enum(["PRIVATE", "PUBLIC"]),
});

type FormValues = z.infer<typeof schema>;

interface InitialMember {
  userId: ID;
  name: string | null;
  email: string;
}

interface ProjectCreateDialogProps {
  open: boolean;
  onClose: () => void;
}

const COLOR_PRESETS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#475569",
];

export function ProjectCreateDialog({
  open,
  onClose,
}: ProjectCreateDialogProps) {
  const router = useRouter();
  const createMut = useCreateProject();
  const [members, setMembers] = useState<InitialMember[]>([]);
  const [color, setColor] = useState<string>(COLOR_PRESETS[0]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      color: COLOR_PRESETS[0],
      visibility: "PRIVATE",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        slug: "",
        description: "",
        color: COLOR_PRESETS[0],
        visibility: "PRIVATE",
      });
      setMembers([]);
      setColor(COLOR_PRESETS[0]);
    }
  }, [open, form]);

  const addMember = (u: OrgUser | null) => {
    if (!u) return;
    if (members.some((m) => m.userId === u.id)) return;
    setMembers((prev) => [
      ...prev,
      { userId: u.id, name: u.name, email: u.email },
    ]);
  };

  const removeMember = (userId: ID) => {
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const created = await createMut.mutateAsync({
        name: values.name,
        slug: values.slug ? values.slug.toUpperCase() : undefined,
        description: values.description || undefined,
        color,
        visibility: values.visibility as ProjectVisibility,
        members: members.map((m) => ({ userId: m.userId })),
      });
      toast.success("Đã tạo dự án");
      onClose();
      router.push(`/projects/${created.slug}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không tạo được dự án";
      toast.error(msg);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo dự án mới</DialogTitle>
          <DialogDescription>
            Khởi tạo dự án với 3 cột mặc định: Cần làm / Đang làm / Hoàn thành.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên dự án</FormLabel>
                  <FormControl>
                    <Input placeholder="VD: Marketing Q3" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug (tuỳ chọn)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="VD: MKT (3-8 ký tự, A-Z và 0-9)"
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.toUpperCase())
                      }
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
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Màu</FormLabel>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    aria-label={`Chọn màu ${c}`}
                    className="h-7 w-7 rounded-full border-2 transition-transform"
                    style={{
                      backgroundColor: c,
                      borderColor:
                        color === c ? "var(--foreground)" : "transparent",
                      transform: color === c ? "scale(1.1)" : undefined,
                    }}
                  />
                ))}
              </div>
            </FormItem>

            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quyền xem</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PRIVATE">Riêng tư</SelectItem>
                      <SelectItem value="PUBLIC">Công khai trong tổ chức</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Thành viên ban đầu</FormLabel>
              <UserPicker
                value={null}
                onChange={addMember}
                placeholder="Thêm thành viên..."
              />
              {members.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {members.map((m) => (
                    <li
                      key={m.userId}
                      className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs"
                    >
                      <span className="max-w-40 truncate font-medium">
                        {m.name ?? m.email}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 rounded-full"
                        onClick={() => removeMember(m.userId)}
                        aria-label={`Bỏ ${m.name ?? m.email}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </FormItem>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Tạo dự án
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
