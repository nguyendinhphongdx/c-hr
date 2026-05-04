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
import { useDepartments } from "@/features/departments";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPicker } from "@/features/users";

import { useCreateEmployee } from "../hooks/useEmployees";

const NO_DEPARTMENT = "__none__";

const schema = z.object({
  userId: z.string().uuid("Pick a user"),
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

export function EmployeeCreateView() {
  const router = useRouter();
  const create = useCreateEmployee();
  const departments = useDepartments();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      userId: "",
      code: "",
      title: "",
      hireDate: "",
      departmentId: NO_DEPARTMENT,
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const employee = await create.mutateAsync({
        userId: values.userId,
        code: values.code,
        title: values.title || undefined,
        hireDate: values.hireDate || undefined,
        departmentId:
          values.departmentId === NO_DEPARTMENT ? undefined : values.departmentId,
      });
      toast.success("Employee created");
      router.push(`/employees/${employee.id}`);
    } catch (err) {
      toast.error("Couldn't create employee", {
        description:
          err instanceof Error
            ? err.message
            : "Code may be in use, or the user is already linked.",
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-6 py-8">
      <Button variant="ghost" asChild size="sm" className="gap-2">
        <Link href="/employees">
          <ArrowLeft className="h-3.5 w-3.5" /> All employees
        </Link>
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>New employee</CardTitle>
              <CardDescription>
                Pick a user (required). Personal info — name, email, dob,
                gender, phone — comes from the User record. HR fields below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User</FormLabel>
                    <FormControl>
                      <UserPicker
                        value={field.value || null}
                        onChange={(u) => field.onChange(u?.id ?? "")}
                      />
                    </FormControl>
                    <FormDescription>
                      Only users not yet linked to another Employee are shown.
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
                    <FormLabel>Employee code</FormLabel>
                    <FormControl>
                      <Input placeholder="EMP-0001" {...field} />
                    </FormControl>
                    <FormDescription>
                      Unique within this Org. Used in URLs and reports.
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
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Senior Engineer" {...field} />
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
                    <FormLabel>Department</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_DEPARTMENT}>(no department)</SelectItem>
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
                    <FormLabel>Hire date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button type="button" variant="ghost" asChild>
                <Link href="/employees">Cancel</Link>
              </Button>
              <Button
                type="submit"
                className="gap-2"
                disabled={create.isPending}
              >
                {create.isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Create employee
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
