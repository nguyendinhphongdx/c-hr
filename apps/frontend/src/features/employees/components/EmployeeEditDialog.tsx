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
import { useDepartments } from "@/features/departments";
import { UserPicker } from "@/features/users";
import type { ID } from "@/lib/types";

import { useEmployee, useUpdateEmployee } from "../hooks/useEmployees";

const NO_DEPARTMENT = "__none__";

const schema = z.object({
  userId: z.string().uuid("Chọn người dùng"),
  title: z.string().max(100).nullable(),
  hireDate: z.string().nullable(),
  terminationDate: z.string().nullable(),
  departmentId: z.union(
    [z.literal(NO_DEPARTMENT), z.string().uuid("Chọn phòng ban hợp lệ")],
    { message: "Chọn phòng ban hợp lệ" },
  ),
  status: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED"]),
});

type FormValues = z.infer<typeof schema>;

interface EmployeeEditDialogProps {
  id: ID | null;
  onClose: () => void;
}

function toInputDate(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function EmployeeEditDialog({ id, onClose }: EmployeeEditDialogProps) {
  const employee = useEmployee(id);
  const departments = useDepartments();
  const update = useUpdateEmployee();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      userId: "",
      title: "",
      hireDate: "",
      terminationDate: "",
      departmentId: NO_DEPARTMENT,
      status: "ACTIVE",
    },
  });

  useEffect(() => {
    if (employee.data) {
      const e = employee.data;
      form.reset({
        userId: e.user?.id ?? "",
        title: e.title ?? "",
        hireDate: toInputDate(e.hireDate),
        terminationDate: toInputDate(e.terminationDate),
        departmentId: e.departmentId ?? NO_DEPARTMENT,
        status: e.status,
      });
    }
  }, [employee.data, form]);

  const onSubmit = async (values: FormValues) => {
    if (!id) return;
    try {
      await update.mutateAsync({
        id,
        data: {
          userId: values.userId,
          title: values.title || null,
          hireDate: values.hireDate || null,
          terminationDate: values.terminationDate || null,
          departmentId:
            values.departmentId === NO_DEPARTMENT ? null : values.departmentId,
          status: values.status,
        },
      });
      toast.success("Đã cập nhật nhân viên");
      onClose();
    } catch (err) {
      toast.error("Không cập nhật được nhân viên", {
        description:
          err instanceof Error
            ? err.message
            : "Người dùng có thể đã liên kết, hoặc phòng ban không thuộc Org này.",
      });
    }
  };

  const linkedUser = employee.data?.user ?? null;
  const headerName = linkedUser?.name ?? "(không tên)";

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Sửa nhân viên</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs">{employee.data?.code ?? "…"}</span>
            {" · "}
            {headerName}
          </DialogDescription>
        </DialogHeader>

        {employee.isLoading || !employee.data ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải…
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              id="edit-employee-form"
            >
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Người dùng</FormLabel>
                    <FormControl>
                      <UserPicker
                        value={field.value || null}
                        onChange={(u) => field.onChange(u?.id ?? "")}
                        availableForLink
                        includeLinkedTo={id ?? undefined}
                        fallback={
                          linkedUser
                            ? { name: linkedUser.name, email: linkedUser.email }
                            : null
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Liên kết lại với người dùng khác — thông tin cá nhân đi kèm.
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
                      <Input
                        placeholder="Senior Engineer"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="hireDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày vào</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="terminationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày nghỉ việc</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Kết hợp với trạng thái TERMINATED.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trạng thái</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Đang làm</SelectItem>
                        <SelectItem value="ON_LEAVE">Đang nghỉ</SelectItem>
                        <SelectItem value="TERMINATED">Đã nghỉ việc</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button
            type="submit"
            form="edit-employee-form"
            disabled={
              update.isPending || !employee.data || !form.formState.isDirty
            }
            className="gap-2"
          >
            {update.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
