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
  userId: z.string().uuid("Phải là UUID"),
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
          <CardTitle>Quản trị app</CardTitle>
          <CardDescription>
            Chỉ Org admin mới xem và quản lý được quyền quản trị từng app.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const onGrant = async (values: GrantValues) => {
    try {
      await grant.mutateAsync(values);
      toast.success("Đã cấp quyền quản trị app");
      form.reset({ userId: "", appCode: values.appCode });
    } catch (err) {
      toast.error("Không cấp được quyền", {
        description:
          err instanceof Error
            ? err.message
            : "Đảm bảo người dùng thuộc Org này và có role=user.",
      });
    }
  };

  const onRevoke = async (id: string, label: string) => {
    if (!confirm(`Thu hồi quyền quản trị app của ${label}?`)) return;
    try {
      await revoke.mutateAsync(id);
      toast.success("Đã thu hồi quyền");
    } catch (err) {
      toast.error("Không thu hồi được", {
        description: err instanceof Error ? err.message : "Thử lại sau.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> Cấp quyền quản trị app
          </CardTitle>
          <CardDescription>
            Cấp cho một người dùng (role=user) quyền quản trị một app cụ thể
            trong Org này. Org admin mặc định kế thừa appadmin nên không cần cấp.
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
                    <FormLabel>Người dùng</FormLabel>
                    <FormControl>
                      <UserPicker
                        value={field.value || null}
                        onChange={(u) => field.onChange(u?.id ?? "")}
                        placeholder="Chọn người dùng trong Org này…"
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
                  Cấp quyền
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách hiện tại</CardTitle>
          <CardDescription>
            Những người dùng dưới đây có quyền appadmin trong Org này. Org admin
            mặc định kế thừa nên không hiển thị ở đây.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải…
            </div>
          ) : list.error ? (
            <p className="text-sm text-destructive">
              Không tải được danh sách.
            </p>
          ) : !list.data?.length ? (
            <p className="text-sm text-muted-foreground">
              Chưa có ai. Dùng form bên trên để cấp quyền đầu tiên.
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
                    aria-label="Thu hồi"
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
