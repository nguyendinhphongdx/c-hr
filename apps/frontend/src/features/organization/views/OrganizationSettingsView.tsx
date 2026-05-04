"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import { useAuth, useIsAdmin } from "@/features/auth";

import { useUpdateOrganization } from "../hooks/useOrganization";

const schema = z.object({
  name: z.string().min(2, "At least 2 characters").max(100),
  timezone: z.string().max(64),
  currency: z.string().max(8),
});

type FormValues = z.infer<typeof schema>;

export function OrganizationSettingsView() {
  const { organization } = useAuth();
  const isAdmin = useIsAdmin();
  const update = useUpdateOrganization();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: organization?.name ?? "",
      timezone: organization?.timezone ?? "Asia/Ho_Chi_Minh",
      currency: organization?.currency ?? "VND",
    },
  });

  useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name,
        timezone: organization.timezone,
        currency: organization.currency,
      });
    }
  }, [organization, form]);

  if (!organization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>
            You don&apos;t belong to an organization yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const readOnly = !isAdmin;

  const onSubmit = async (values: FormValues) => {
    try {
      await update.mutateAsync(values);
      toast.success("Organization updated");
    } catch (err) {
      toast.error("Couldn't update organization", {
        description: err instanceof Error ? err.message : "Try again later.",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>
              {readOnly
                ? "Read-only — only Org admin can edit these fields."
                : "Settings shared by everyone in this Organization."}
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
                    <Input disabled={readOnly} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <FormLabel>Slug</FormLabel>
              <Input value={organization.slug} disabled />
              <p className="text-xs text-muted-foreground">
                Slug is fixed at signup and used in URLs.
              </p>
            </div>
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <Input disabled={readOnly} {...field} />
                  </FormControl>
                  <FormDescription>
                    IANA name, e.g. <code>Asia/Ho_Chi_Minh</code>. Used for
                    attendance + payroll period boundaries.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input disabled={readOnly} {...field} />
                  </FormControl>
                  <FormDescription>
                    ISO 4217 code, e.g. <code>VND</code>, <code>USD</code>.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          {!readOnly && (
            <CardFooter className="justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  form.reset({
                    name: organization.name,
                    timezone: organization.timezone,
                    currency: organization.currency,
                  })
                }
                disabled={!form.formState.isDirty || update.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="gap-2"
                disabled={!form.formState.isDirty || update.isPending}
              >
                {update.isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Save changes
              </Button>
            </CardFooter>
          )}
        </Card>
      </form>
    </Form>
  );
}
