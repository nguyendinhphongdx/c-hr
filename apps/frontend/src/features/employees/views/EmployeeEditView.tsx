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
import { useDepartments } from "@/features/departments";
import { UserPicker } from "@/features/users";
import type { ID } from "@/lib/types";

import {
  useDeleteEmployee,
  useEmployee,
  useUpdateEmployee,
} from "../hooks/useEmployees";

const NO_DEPARTMENT = "__none__";

const schema = z.object({
  userId: z.string().uuid("Pick a user"),
  title: z.string().max(100).nullable(),
  hireDate: z.string().nullable(),
  terminationDate: z.string().nullable(),
  departmentId: z.union(
    [z.literal(NO_DEPARTMENT), z.string().uuid("Pick a valid department")],
    { message: "Pick a valid department" },
  ),
  status: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED"]),
});

type FormValues = z.infer<typeof schema>;

interface EmployeeEditViewProps {
  id: ID;
}

function toInputDate(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function EmployeeEditView({ id }: EmployeeEditViewProps) {
  const router = useRouter();
  const employee = useEmployee(id);
  const departments = useDepartments();
  const update = useUpdateEmployee();
  const remove = useDeleteEmployee();

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

  if (employee.isLoading) {
    return (
      <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (employee.error || !employee.data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-sm text-destructive">Employee not found.</p>
        <Button variant="ghost" asChild className="mt-4 gap-2">
          <Link href="/employees">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
        </Button>
      </div>
    );
  }

  const onSubmit = async (values: FormValues) => {
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
      toast.success("Employee updated");
      router.push(`/employees/${id}`);
    } catch (err) {
      toast.error("Couldn't update employee", {
        description:
          err instanceof Error
            ? err.message
            : "User may already be linked, or the department isn't in this Org.",
      });
    }
  };

  const linkedUser = employee.data.user;
  const fullName = linkedUser?.name ?? "(no name)";

  const onDelete = async () => {
    if (
      !confirm(
        `Soft-delete "${fullName}"? They'll disappear from listings but the row stays in the DB for history.`,
      )
    ) {
      return;
    }
    try {
      await remove.mutateAsync(id);
      toast.success("Employee deleted");
      router.push("/employees");
    } catch (err) {
      toast.error("Couldn't delete", {
        description: err instanceof Error ? err.message : "Try again later.",
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-6 py-8">
      <Button variant="ghost" asChild size="sm" className="gap-2">
        <Link href={`/employees/${id}`}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to {fullName}
        </Link>
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Edit employee</CardTitle>
              <CardDescription>
                <span className="font-mono text-xs">{employee.data.code}</span>{" "}
                · {fullName}
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
                        availableForLink
                        includeLinkedTo={id}
                        fallback={
                          linkedUser
                            ? { name: linkedUser.name, email: linkedUser.email }
                            : null
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Re-link to a different user — personal info will follow.
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
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="hireDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hire date</FormLabel>
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
                      <FormLabel>Termination date</FormLabel>
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
                        Pair with status TERMINATED.
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
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="ON_LEAVE">On leave</SelectItem>
                        <SelectItem value="TERMINATED">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
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
                Delete
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" asChild>
                  <Link href={`/employees/${id}`}>Cancel</Link>
                </Button>
                <Button
                  type="submit"
                  className="gap-2"
                  disabled={update.isPending || !form.formState.isDirty}
                >
                  {update.isPending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Save changes
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
