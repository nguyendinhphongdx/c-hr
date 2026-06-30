"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogBody,
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
import { useIsAppAdmin } from "@/features/auth";
import { useDepartments } from "@/features/departments";
import { UserPicker } from "@/features/users";
import type { ID } from "@/lib/types";

import { useEmployee, useUpdateEmployee } from "../hooks/useEmployees";

const NO_DEPARTMENT = "__none__";

const schema = z.object({
  code: z
    .string()
    .min(1, "Bắt buộc")
    .max(50)
    .regex(/^[A-Za-z0-9-_]+$/, "Chỉ chữ cái, số, gạch ngang, gạch dưới"),
  attendanceCode: z
    .string()
    .max(50)
    .refine(
      (value) => value === "" || /^[A-Za-z0-9-_]+$/.test(value),
      "Chỉ chữ cái, số, gạch ngang, gạch dưới",
    )
    .nullable(),
  userId: z.string().uuid("Chọn người dùng"),
  title: z.string().max(100).nullable(),
  hireDate: z.string().nullable(),
  terminationDate: z.string().nullable(),
  departmentId: z.union(
    [z.literal(NO_DEPARTMENT), z.string().uuid("Chọn phòng ban hợp lệ")],
    { message: "Chọn phòng ban hợp lệ" },
  ),
  status: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED"]),
  // Salary / BHXH — strings on the form, parsed/coerced on submit.
  baseSalary: z.string().nullable(),
  dependents: z
    .number()
    .int()
    .min(0, "Phải là số nguyên >= 0"),
  region: z.enum(["REGION_I", "REGION_II", "REGION_III", "REGION_IV"]),
  taxCode: z
    .string()
    .refine(
      (s) => s === "" || /^\d{10}$/.test(s),
      "Phải đúng 10 chữ số hoặc để trống",
    )
    .nullable(),
  bhxhCode: z.string().max(20).nullable(),
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
  const isHrmAdmin = useIsAppAdmin("HRM");
  const [salaryOpen, setSalaryOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      attendanceCode: "",
      userId: "",
      title: "",
      hireDate: "",
      terminationDate: "",
      departmentId: NO_DEPARTMENT,
      status: "ACTIVE",
      baseSalary: "",
      dependents: 0,
      region: "REGION_I",
      taxCode: "",
      bhxhCode: "",
    },
  });

  useEffect(() => {
    if (employee.data) {
      const e = employee.data;
      form.reset({
        code: e.code,
        attendanceCode: e.attendanceCode ?? "",
        userId: e.user?.id ?? "",
        title: e.title ?? "",
        hireDate: toInputDate(e.hireDate),
        terminationDate: toInputDate(e.terminationDate),
        departmentId: e.departmentId ?? NO_DEPARTMENT,
        status: e.status,
        baseSalary: e.baseSalary ?? "",
        dependents: e.dependents ?? 0,
        region: e.region ?? "REGION_I",
        taxCode: e.taxCode ?? "",
        bhxhCode: e.bhxhCode ?? "",
      });
    }
  }, [employee.data, form]);

  const onSubmit = async (values: FormValues) => {
    if (!id) return;
    try {
      const baseSalaryNum =
        values.baseSalary && values.baseSalary.trim() !== ""
          ? Number(values.baseSalary)
          : null;
      await update.mutateAsync({
        id,
        data: {
          code: values.code,
          attendanceCode: values.attendanceCode || null,
          userId: values.userId,
          title: values.title || null,
          hireDate: values.hireDate || null,
          terminationDate: values.terminationDate || null,
          departmentId:
            values.departmentId === NO_DEPARTMENT ? null : values.departmentId,
          status: values.status,
          // Only send salary fields if caller is HRM admin — BE re-checks
          // but the omission keeps the audit log clean for non-admin edits.
          ...(isHrmAdmin
            ? {
                baseSalary:
                  baseSalaryNum != null && Number.isFinite(baseSalaryNum)
                    ? baseSalaryNum
                    : null,
                dependents: Number(values.dependents) || 0,
                region: values.region,
                taxCode: values.taxCode ? values.taxCode : null,
                bhxhCode: values.bhxhCode ? values.bhxhCode : null,
              }
            : {}),
        },
      });
      toast.success("Đã cập nhật nhân sự");
      onClose();
    } catch (err) {
      toast.error("Không cập nhật được nhân sự", {
        description:
          err instanceof Error
            ? err.message
            : "Mã nhân viên hoặc người dùng có thể đã được dùng.",
      });
    }
  };

  const linkedUser = employee.data?.user ?? null;
  const headerName = linkedUser?.name ?? "(không tên)";

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Sửa nhân sự</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs">{employee.data?.code ?? "…"}</span>
            {" · "}
            {headerName}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
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
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mã nhân viên</FormLabel>
                      <FormControl>
                        <Input placeholder="EMP-0001" {...field} />
                      </FormControl>
                      <FormDescription>
                        Mã hồ sơ nhân sự, không dùng để đối chiếu máy chấm công.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="attendanceCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mã chấm công</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="00001"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Phải giống mã được cài trên tất cả máy chấm công.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                        filter={(u) =>
                          u.employeeId === null || u.employeeId === id
                        }
                        fallback={
                          linkedUser
                            ? { name: linkedUser.name, email: linkedUser.email }
                            : null
                        }
                        disabled
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

              <div className="grid gap-4 grid-cols-2">
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phòng ban</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trạng thái</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
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
              </div>

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

              {isHrmAdmin && (
                <Collapsible open={salaryOpen} onOpenChange={setSalaryOpen}>
                  <div className="rounded-md border bg-muted/30">
                    <CollapsibleTrigger asChild>
                      <button className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50">
                        <div>
                          <h4 className="text-sm font-semibold">Lương &amp; BHXH</h4>
                          <p className="text-xs text-muted-foreground">
                            Dùng cho tính lương tháng (F9). Chỉ HRM admin nhìn thấy.
                          </p>
                        </div>
                        <ChevronDown
                          className="h-4 w-4 shrink-0 transition-transform"
                          style={{
                            transform: salaryOpen ? "rotate(180deg)" : "rotate(0deg)",
                          }}
                        />
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="space-y-4 border-t px-4 py-4">

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="baseSalary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lương cơ bản (VND)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              inputMode="numeric"
                              placeholder="22000000"
                              min={0}
                              step={100000}
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Để trống = chưa thiết lập.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dependents"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Số người phụ thuộc</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={String(field.value ?? 0)}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Áp dụng giảm trừ gia cảnh thuế TNCN.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vùng lương tối thiểu</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="REGION_I">
                              Vùng I — TP.HCM, Hà Nội (nội thành)
                            </SelectItem>
                            <SelectItem value="REGION_II">Vùng II</SelectItem>
                            <SelectItem value="REGION_III">Vùng III</SelectItem>
                            <SelectItem value="REGION_IV">Vùng IV</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">
                          Quyết định mức trần đóng BHXH/BHYT/BHTN.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="taxCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mã số thuế</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="10 chữ số"
                              maxLength={10}
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
                      name="bhxhCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Số sổ BHXH</FormLabel>
                          <FormControl>
                            <Input
                              maxLength={20}
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
                  </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}
            </form>
          </Form>
        )}
        </DialogBody>

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
