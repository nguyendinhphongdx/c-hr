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
  name: z.string().min(2, "Ít nhất 2 ký tự").max(100),
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
          <CardTitle>Doanh nghiệp</CardTitle>
          <CardDescription>
            Bạn chưa thuộc Org nào.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const readOnly = !isAdmin;

  const onSubmit = async (values: FormValues) => {
    try {
      await update.mutateAsync(values);
      toast.success("Đã cập nhật doanh nghiệp");
    } catch (err) {
      toast.error("Không cập nhật được doanh nghiệp", {
        description: err instanceof Error ? err.message : "Thử lại sau.",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Doanh nghiệp</CardTitle>
            <CardDescription>
              {readOnly
                ? "Chỉ đọc — chỉ Org admin mới sửa được các trường này."
                : "Thiết lập dùng chung cho mọi thành viên trong Org này."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên</FormLabel>
                  <FormControl>
                    <Input disabled={readOnly} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <FormLabel>Mã định danh</FormLabel>
              <Input value={organization.slug} disabled />
              <p className="text-xs text-muted-foreground">
                Mã định danh cố định từ lúc đăng ký và dùng trong URL.
              </p>
            </div>
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Múi giờ</FormLabel>
                  <FormControl>
                    <Input disabled={readOnly} {...field} />
                  </FormControl>
                  <FormDescription>
                    Tên IANA, ví dụ <code>Asia/Ho_Chi_Minh</code>. Dùng cho biên
                    kỳ chấm công + payroll.
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
                  <FormLabel>Tiền tệ</FormLabel>
                  <FormControl>
                    <Input disabled={readOnly} {...field} />
                  </FormControl>
                  <FormDescription>
                    Mã ISO 4217, ví dụ <code>VND</code>, <code>USD</code>.
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
                Huỷ
              </Button>
              <Button
                type="submit"
                className="gap-2"
                disabled={!form.formState.isDirty || update.isPending}
              >
                {update.isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Lưu
              </Button>
            </CardFooter>
          )}
        </Card>
      </form>
    </Form>
  );
}
