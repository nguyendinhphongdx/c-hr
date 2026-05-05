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

import { useCreateEmployee } from "../hooks/useEmployees";

const NO_DEPARTMENT = "__none__";

const schema = z.object({
  email: z.string().email("Invalid email").max(255),
  name: z.string().min(1, "Required").max(100),
  password: z.string().min(8, "At least 8 characters").max(100),
  code: z
    .string()
    .min(1, "Required")
    .max(50)
    .regex(/^[A-Za-z0-9-_]+$/, "Letters, digits, hyphens, underscores only"),
  title: z.string().max(100).optional(),
  hireDate: z.string().optional(),
  departmentId: z.union(
    [z.literal(NO_DEPARTMENT), z.string().uuid("Pick a valid department")],
    { message: "Pick a valid department" },
  ),
});

type FormValues = z.infer<typeof schema>;

interface EmployeeCreateDialogProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULTS: FormValues = {
  email: "",
  name: "",
  password: "",
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

  // Reset whenever the dialog re-opens so leftover values from a previous
  // attempt don't bleed in.
  useEffect(() => {
    if (open) form.reset(DEFAULTS);
  }, [open, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      await create.mutateAsync({
        email: values.email,
        name: values.name,
        password: values.password,
        code: values.code,
        title: values.title || undefined,
        hireDate: values.hireDate || undefined,
        departmentId:
          values.departmentId === NO_DEPARTMENT ? undefined : values.departmentId,
      });
      toast.success("Employee created", {
        description: `${values.name} can log in with ${values.email}.`,
      });
      onClose();
    } catch (err) {
      toast.error("Couldn't create employee", {
        description:
          err instanceof Error
            ? err.message
            : "Email or code may already be in use.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add staff</DialogTitle>
          <DialogDescription>
            Tạo đồng thời tài khoản User (login) + hồ sơ Employee. Chia sẻ
            password ban đầu cho nhân viên qua kênh an toàn — họ tự đổi sau.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            id="create-employee-form"
          >
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
                      <Input type="email" placeholder="user@acme.com" {...field} />
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
                        <SelectItem value={NO_DEPARTMENT}>(none)</SelectItem>
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
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-employee-form"
            disabled={create.isPending}
            className="gap-2"
          >
            {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
