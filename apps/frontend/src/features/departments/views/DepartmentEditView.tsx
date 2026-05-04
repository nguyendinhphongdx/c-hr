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
  name: z.string().min(1, "Required").max(100),
  parentId: z.union([z.literal(NO_PARENT), z.string().uuid("Pick a valid parent")], {
    message: "Pick a valid parent",
  }),
  managerId: z.string().uuid("Pick a valid manager").nullable(),
  code: z
    .string()
    .max(50)
    .regex(/^[A-Za-z0-9-_]*$/, "Letters, digits, hyphens, underscores only")
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
      <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (dept.error || !dept.data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-sm text-destructive">Department not found.</p>
        <Button variant="ghost" asChild className="mt-4 gap-2">
          <Link href="/departments">
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
          name: values.name,
          parentId: values.parentId === NO_PARENT ? null : values.parentId,
          managerId: values.managerId === null ? null : values.managerId || null,
          code: values.code || undefined,
        },
      });
      toast.success("Department updated");
      router.push("/departments");
    } catch (err) {
      toast.error("Couldn't update department", {
        description:
          err instanceof Error
            ? err.message
            : "Code conflict, parent cycle, or invalid manager.",
      });
    }
  };

  const onDelete = async () => {
    if (
      !confirm(
        `Soft-delete "${dept.data.name}"? The row stays in the DB for history but disappears from the tree.`,
      )
    ) {
      return;
    }
    try {
      await remove.mutateAsync(id);
      toast.success("Department deleted");
      router.push("/departments");
    } catch (err) {
      toast.error("Couldn't delete", {
        description: err instanceof Error ? err.message : "Try again later.",
      });
    }
  };

  // Don't let the user pick the dept itself as its own parent (server-side
  // cycle guard handles deeper cases).
  const parentOptions = (list.data ?? []).filter((d) => d.id !== id);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-6 py-8">
      <Button variant="ghost" asChild size="sm" className="gap-2">
        <Link href="/departments">
          <ArrowLeft className="h-3.5 w-3.5" /> All departments
        </Link>
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Edit department</CardTitle>
              <CardDescription>{dept.data.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
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
                    <FormLabel>Parent</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="(root)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_PARENT}>(root)</SelectItem>
                        {parentOptions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                            {d.code ? ` · ${d.code}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Server rejects parents that would create a cycle.
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
                    <FormLabel>Code</FormLabel>
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
                    <FormLabel>Manager</FormLabel>
                    <FormControl>
                      <EmployeePicker
                        value={field.value}
                        onChange={(next) => field.onChange(next)}
                      />
                    </FormControl>
                    <FormDescription>
                      Search by name, email, or code. Clear to detach.
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
                Delete
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" asChild>
                  <Link href="/departments">Cancel</Link>
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
