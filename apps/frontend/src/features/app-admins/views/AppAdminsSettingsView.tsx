"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Shield, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsAdmin } from "@/features/auth";
import { UserPicker } from "@/features/users";

import {
  useAppAdmins,
  useGrantAppAdmin,
  useRevokeAppAdmin,
} from "../hooks/useAppAdmins";

const APPS = [{ value: "HRM", label: "HRM" }] as const;

const grantSchema = z.object({
  userId: z.string().uuid("Must be a UUID"),
  appCode: z.enum(["HRM"]),
});
type GrantValues = z.infer<typeof grantSchema>;

export function AppAdminsSettingsView() {
  const isAdmin = useIsAdmin();
  const list = useAppAdmins();
  const grant = useGrantAppAdmin();
  const revoke = useRevokeAppAdmin();

  const form = useForm<GrantValues>({
    resolver: zodResolver(grantSchema),
    defaultValues: { userId: "", appCode: "HRM" },
  });

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>App admins</CardTitle>
          <CardDescription>
            Only Org admin can view or manage per-app admin grants.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const onGrant = async (values: GrantValues) => {
    try {
      await grant.mutateAsync(values);
      toast.success("App admin granted");
      form.reset({ userId: "", appCode: values.appCode });
    } catch (err) {
      toast.error("Couldn't grant app admin", {
        description:
          err instanceof Error
            ? err.message
            : "Make sure the user belongs to this Org and has role=user.",
      });
    }
  };

  const onRevoke = async (id: string, label: string) => {
    if (!confirm(`Revoke app admin grant for ${label}?`)) return;
    try {
      await revoke.mutateAsync(id);
      toast.success("App admin revoked");
    } catch (err) {
      toast.error("Couldn't revoke", {
        description: err instanceof Error ? err.message : "Try again later.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> Grant app admin
          </CardTitle>
          <CardDescription>
            Give a user (with role=user) admin powers for a specific app in
            this Org. Org admins inherit appadmin and don&apos;t need a grant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onGrant)}
              className="grid gap-3 md:grid-cols-[1fr_180px_auto]"
            >
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
                        availableForLink={false}
                        placeholder="Pick a user in this Org…"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="appCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>App</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {APPS.map((app) => (
                          <SelectItem key={app.value} value={app.value}>
                            {app.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-end">
                <Button type="submit" disabled={grant.isPending} className="gap-2">
                  {grant.isPending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Grant
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current grants</CardTitle>
          <CardDescription>
            Listed users have appadmin access in this Org. Org admins are
            implicit and not shown here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : list.error ? (
            <p className="text-sm text-destructive">
              Couldn&apos;t load grants.
            </p>
          ) : !list.data?.length ? (
            <p className="text-sm text-muted-foreground">
              No grants yet. Use the form above to add the first one.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {list.data.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {row.user.name ?? row.user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.user.email} · {row.appCode}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      onRevoke(row.id, row.user.name ?? row.user.email)
                    }
                    disabled={revoke.isPending}
                    aria-label="Revoke"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
