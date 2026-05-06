"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

import { EmployeePicker } from "@/features/employees/components/EmployeePicker";

import {
  useCreateDepartment,
  useDepartments,
} from "../hooks/useDepartments";

const NO_PARENT = "__none__";

const schema = z.object({
  name: z.string().min(1, "Bắt buộc").max(100),
  parentId: z.union([z.literal(NO_PARENT), z.string().uuid("Chọn phòng ban cha hợp lệ")], {
    message: "Chọn phòng ban cha hợp lệ",
  }),
  managerId: z
    .string()
    .uuid("Chọn quản lý hợp lệ")
    .or(z.literal(""))
    .optional(),
  code: z
    .string()
    .max(50)
    .regex(/^[A-Za-z0-9-_]*$/, "Chỉ chữ cái, số, gạch ngang, gạch dưới")
    .optional(),
});

type FormValues = z.infer<typeof schema>;

export function DepartmentCreateView() {
  const router = useRouter();
  const create = useCreateDepartment();
  const list = useDepartments();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      parentId: NO_PARENT,
      managerId: "",
      code: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const dept = await create.mutateAsync({
        name: values.name,
        parentId:
          values.parentId === NO_PARENT ? undefined : values.parentId,
        managerId: values.managerId || undefined,
        code: values.code || undefined,
      });
      toast.success("Đã tạo phòng ban");
      router.push(`/departments?focus=${dept.id}`);
    } catch (err) {
      toast.error("Không tạo được phòng ban", {
        description:
          err instanceof Error
            ? err.message
            : "Mã có thể đã được dùng, hoặc phòng ban cha / quản lý không hợp lệ.",
      });
    }
  };

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
              <CardTitle>Phòng ban mới</CardTitle>
              <CardDescription>
                Chọn phòng ban cha (hoặc để là gốc). Quản lý có thể gán sau từ
                trang chi tiết.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên</FormLabel>
                    <FormControl>
                      <Input placeholder="Engineering" autoFocus {...field} />
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
                        {list.data?.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                            {d.code ? ` · ${d.code}` : ""}
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
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã</FormLabel>
                    <FormControl>
                      <Input placeholder="ENG-01" {...field} />
                    </FormControl>
                    <FormDescription>
                      Tuỳ chọn. Chỉ chữ cái, số, gạch ngang, gạch dưới. Unique
                      trong Org.
                    </FormDescription>
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
                        value={field.value || null}
                        onChange={(id) => field.onChange(id ?? "")}
                      />
                    </FormControl>
                    <FormDescription>
                      Tuỳ chọn. Tìm theo tên, email hoặc mã.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button type="button" variant="ghost" asChild>
                <Link href="/departments">Huỷ</Link>
              </Button>
              <Button
                type="submit"
                className="gap-2"
                disabled={create.isPending}
              >
                {create.isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Tạo phòng ban
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </PageContainer>
  );
}
