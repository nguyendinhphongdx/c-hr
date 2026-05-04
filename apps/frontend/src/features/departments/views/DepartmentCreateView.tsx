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

import { EmployeePicker } from "@/features/employees/components/EmployeePicker";

import {
  useCreateDepartment,
  useDepartments,
} from "../hooks/useDepartments";

const NO_PARENT = "__none__";

const schema = z.object({
  name: z.string().min(1, "Required").max(100),
  parentId: z.union([z.literal(NO_PARENT), z.string().uuid("Pick a valid parent")], {
    message: "Pick a valid parent",
  }),
  managerId: z
    .string()
    .uuid("Pick a valid manager")
    .or(z.literal(""))
    .optional(),
  code: z
    .string()
    .max(50)
    .regex(/^[A-Za-z0-9-_]*$/, "Letters, digits, hyphens, underscores only")
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
      toast.success("Department created");
      router.push(`/departments?focus=${dept.id}`);
    } catch (err) {
      toast.error("Couldn't create department", {
        description:
          err instanceof Error
            ? err.message
            : "Code may already be in use, or parent / manager invalid.",
      });
    }
  };

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
              <CardTitle>New department</CardTitle>
              <CardDescription>
                Pick a parent (or leave as root). Manager can be assigned later
                from the detail page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
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
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="ENG-01" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional. Letters, digits, hyphens, underscores. Unique
                      within Org.
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
                    <FormLabel>Manager</FormLabel>
                    <FormControl>
                      <EmployeePicker
                        value={field.value || null}
                        onChange={(id) => field.onChange(id ?? "")}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional. Search by name, email, or code.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button type="button" variant="ghost" asChild>
                <Link href="/departments">Cancel</Link>
              </Button>
              <Button
                type="submit"
                className="gap-2"
                disabled={create.isPending}
              >
                {create.isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Create department
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
