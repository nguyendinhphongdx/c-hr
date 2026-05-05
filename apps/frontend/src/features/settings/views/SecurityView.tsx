"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useChangePassword } from "@/features/auth";

const schema = z
  .object({
    current_password: z.string().min(1, "Bắt buộc"),
    new_password: z.string().min(8, "Ít nhất 8 ký tự"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    path: ["confirm_password"],
    message: "Mật khẩu nhập lại không khớp",
  });

type FormValues = z.infer<typeof schema>;

export function SecurityView() {
  const changePassword = useChangePassword();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.current_password,
        newPassword: values.new_password,
      });
      toast.success("Đã đổi mật khẩu");
      form.reset();
    } catch (err) {
      toast.error("Không đổi được mật khẩu", {
        description:
          err instanceof Error
            ? err.message
            : "Kiểm tra lại mật khẩu hiện tại rồi thử lại.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đổi mật khẩu</CardTitle>
        <CardDescription>
          Khi đổi mật khẩu, các thiết bị khác đang đăng nhập tài khoản của bạn
          sẽ tự động bị đăng xuất.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="current_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mật khẩu hiện tại</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="new_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mật khẩu mới</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nhập lại mật khẩu mới</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="gap-2"
              disabled={changePassword.isPending}
            >
              {changePassword.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Đổi mật khẩu
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
