"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmployeePicker } from "@/features/employees";
import type { ID } from "@/lib/types";

import {
  useDeleteDepartment,
  useDepartment,
  useDepartments,
  useUpdateDepartment,
} from "../hooks/useDepartments";

const NO_PARENT = "__none__";

const schema = z.object({
  name: z.string().min(1, "Bắt buộc").max(100),
  parentId: z.union([z.literal(NO_PARENT), z.string().uuid("Chọn phòng ban cha hợp lệ")], {
    message: "Chọn phòng ban cha hợp lệ",
  }),
  managerId: z.string().uuid("Chọn quản lý hợp lệ").nullable(),
  code: z
    .string()
    .max(50)
    .regex(/^[A-Za-z0-9-_]*$/, "Chỉ chữ cái, số, gạch ngang, gạch dưới")
    .optional(),
});

type FormValues = z.infer<typeof schema>;

interface DepartmentEditViewProps {
  id: ID;
}

export function DepartmentEditView({ id }: DepartmentEditViewProps) {
  const router = useRouter();
  const dept = useDepartment(id);
  const list = useDepartments();
  const update = useUpdateDepartment();
  const remove = useDeleteDepartment();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      parentId: NO_PARENT,
      managerId: null,
      code: "",
    },
  });

  // Reset the form once the department row arrives.
  useEffect(() => {
    if (dept.data) {
      form.reset({
        name: dept.data.name,
        parentId: dept.data.parentId ?? NO_PARENT,
        managerId: dept.data.managerId ?? null,
        code: dept.data.code ?? "",
      });
    }
  }, [dept.data, form]);

  if (dept.isLoading) {
    return (
      <PageContainer variant="narrow">
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
        </div>
      </PageContainer>
    );
  }

  if (dept.error || !dept.data) {
    return (
      <PageContainer variant="narrow">
        <p className="text-sm text-destructive">Không tìm thấy phòng ban.</p>
        <Button variant="ghost" asChild className="mt-4 gap-2">
          <Link href="/departments">
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
          </Link>
        </Button>
      </PageContainer>
    );
  }

  const onSubmit = async (values: FormValues) => {
    try {
      await update.mutateAsync({
        id,
        data: {
          name: values.name,
          parentId: values.parentId === NO_PARENT ? null : values.parentId,
          managerId: values.managerId === null ? null : values.managerId || null,
          code: values.code || undefined,
        },
      });
      toast.success("Đã cập nhật phòng ban");
      router.push("/departments");
    } catch (err) {
      toast.error("Không cập nhật được phòng ban", {
        description:
          err instanceof Error
            ? err.message
            : "Trùng mã, vòng lặp phòng ban cha, hoặc quản lý không hợp lệ.",
      });
    }
  };

  const onDelete = async () => {
    if (
      !confirm(
        `Soft-delete "${dept.data.name}"? Row vẫn được giữ trong DB cho history nhưng biến khỏi cây.`,
      )
    ) {
      return;
    }
    try {
      await remove.mutateAsync(id);
      toast.success("Đã xoá phòng ban");
      router.push("/departments");
    } catch (err) {
      toast.error("Không xoá được", {
        description: err instanceof Error ? err.message : "Thử lại sau.",
      });
    }
  };

  // Don't let the user pick the dept itself as its own parent (server-side
  // cycle guard handles deeper cases).
  const parentOptions = (list.data ?? []).filter((d) => d.id !== id);

  return (
    <PageContainer variant="narrow">
      <Button variant="ghost" asChild size="sm" className="gap-2">
        <Link href="/departments">
          <ArrowLeft className="h-3.5 w-3.5" /> Tất cả phòng ban
        </Link>
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Sửa phòng ban</CardTitle>
              <CardDescription>{dept.data.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phòng ban cha</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="(gốc)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_PARENT}>(gốc)</SelectItem>
                        {parentOptions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                            {d.code ? ` · ${d.code}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Server sẽ từ chối phòng ban cha tạo thành vòng lặp.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã</FormLabel>
                    <FormControl>
                      <Input placeholder="ENG-01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="managerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quản lý</FormLabel>
                    <FormControl>
                      <EmployeePicker
                        value={field.value}
                        onChange={(next) => field.onChange(next)}
                      />
                    </FormControl>
                    <FormDescription>
                      Tìm theo tên, email hoặc mã. Xoá để bỏ liên kết.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={onDelete}
                disabled={remove.isPending}
              >
                {remove.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Xoá
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" asChild>
                  <Link href="/departments">Huỷ</Link>
                </Button>
                <Button
                  type="submit"
                  className="gap-2"
                  disabled={update.isPending || !form.formState.isDirty}
                >
                  {update.isPending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Lưu
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </PageContainer>
  );
}
