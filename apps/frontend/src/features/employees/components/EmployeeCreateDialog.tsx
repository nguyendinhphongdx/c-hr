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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDepartments } from "@/features/departments";
import { UserPicker } from "@/features/users";

import { useCreateEmployee } from "../hooks/useEmployees";

const NO_DEPARTMENT = "__none__";

const schema = z
  .object({
    mode: z.enum(["create", "link"]),
    email: z.string().max(255).optional(),
    name: z.string().max(100).optional(),
    password: z.string().max(100).optional(),
    userId: z.string().uuid().optional().nullable(),
    code: z
      .string()
      .min(1, "Bắt buộc")
      .max(50)
      .regex(/^[A-Za-z0-9-_]+$/, "Chỉ chữ cái, số, gạch ngang, gạch dưới"),
    title: z.string().max(100).optional(),
    hireDate: z.string().optional(),
    departmentId: z.union(
      [z.literal(NO_DEPARTMENT), z.string().uuid("Chọn phòng ban hợp lệ")],
      { message: "Chọn phòng ban hợp lệ" },
    ),
  })
  .superRefine((val, ctx) => {
    if (val.mode === "create") {
      if (!val.email || !/.+@.+\..+/.test(val.email)) {
        ctx.addIssue({ code: "custom", path: ["email"], message: "Email không hợp lệ" });
      }
      if (!val.name) {
        ctx.addIssue({ code: "custom", path: ["name"], message: "Bắt buộc" });
      }
      if (!val.password || val.password.length < 8) {
        ctx.addIssue({
          code: "custom",
          path: ["password"],
          message: "Ít nhất 8 ký tự",
        });
      }
    } else if (!val.userId) {
      ctx.addIssue({ code: "custom", path: ["userId"], message: "Chọn user" });
    }
  });

type FormValues = z.infer<typeof schema>;

interface EmployeeCreateDialogProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULTS: FormValues = {
  mode: "create",
  email: "",
  name: "",
  password: "",
  userId: null,
  code: "",
  title: "",
  hireDate: "",
  departmentId: NO_DEPARTMENT,
};

export function EmployeeCreateDialog({ open, onClose }: EmployeeCreateDialogProps) {
  const create = useCreateEmployee();
  const departments = useDepartments();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    if (open) form.reset(DEFAULTS);
  }, [open, form]);

  const mode = form.watch("mode");
  const userId = form.watch("userId");

  const onSubmit = async (values: FormValues) => {
    try {
      const sharedFields = {
        code: values.code,
        title: values.title || undefined,
        hireDate: values.hireDate || undefined,
        departmentId:
          values.departmentId === NO_DEPARTMENT ? undefined : values.departmentId,
      };
      if (values.mode === "link") {
        await create.mutateAsync({ ...sharedFields, userId: values.userId ?? undefined });
        toast.success("Đã tạo nhân sự", {
          description: "User đã được liên kết với hồ sơ Employee mới.",
        });
      } else {
        await create.mutateAsync({
          ...sharedFields,
          email: values.email,
          name: values.name,
          password: values.password,
        });
        toast.success("Đã tạo nhân sự", {
          description: `${values.name} có thể đăng nhập bằng ${values.email}.`,
        });
      }
      onClose();
    } catch (err) {
      toast.error("Không tạo được nhân sự", {
        description:
          err instanceof Error
            ? err.message
            : "Email hoặc mã có thể đã được dùng.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Thêm nhân sự</DialogTitle>
          <DialogDescription>
            Tạo user mới + Employee, hoặc liên kết Employee với user đã có
            (ví dụ founder tự đăng ký trước).
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(v) => form.setValue("mode", v as "create" | "link")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Tạo user mới</TabsTrigger>
            <TabsTrigger value="link">Liên kết user có sẵn</TabsTrigger>
          </TabsList>
        </Tabs>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            id="create-employee-form"
          >
            {mode === "create" ? (
              <>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Họ tên</FormLabel>
                      <FormControl>
                        <Input placeholder="Nguyễn Văn A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (login)</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="user@acme.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password ban đầu</FormLabel>
                        <FormControl>
                          <Input type="text" autoComplete="off" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Tối thiểu 8 ký tự.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            ) : (
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User</FormLabel>
                    <FormControl>
                      <UserPicker
                        value={field.value ?? null}
                        onChange={(u) => field.onChange(u?.id ?? null)}
                        placeholder="Chọn user chưa có hồ sơ Employee…"
                        availableForLink
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Chỉ hiển thị user trong Org chưa được gán Employee.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mã nhân sự</FormLabel>
                  <FormControl>
                    <Input placeholder="EMP-0001" {...field} />
                  </FormControl>
                  <FormDescription>
                    Unique trong Org. Dùng cho push từ thiết bị chấm công.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chức danh</FormLabel>
                  <FormControl>
                    <Input placeholder="Senior Engineer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phòng ban</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_DEPARTMENT}>(không có)</SelectItem>
                        {departments.data?.map((d) => (
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
                name="hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày vào</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button
            type="submit"
            form="create-employee-form"
            disabled={create.isPending || (mode === "link" && !userId)}
            className="gap-2"
          >
            {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Tạo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
