"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AuthLayout } from "../components/AuthLayout";
import { useResetPassword } from "../hooks/useAuth";

const schema = z
  .object({
    new_password: z.string().min(8, "Ít nhất 8 ký tự"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    path: ["confirm_password"],
    message: "Mật khẩu nhập lại không khớp",
  });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordView() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const reset = useResetPassword();
  const [done, setDone] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  if (!token) {
    return (
      <AuthLayout
        title="Đường dẫn không hợp lệ"
        subtitle="Hãy mở đường dẫn từ email, hoặc yêu cầu một đường dẫn mới."
      >
        <Button asChild className="w-full">
          <Link href="/forgot-password">Yêu cầu đường dẫn mới</Link>
        </Button>
      </AuthLayout>
    );
  }

  const onSubmit = async (data: FormValues) => {
    try {
      await reset.mutateAsync({ token, new_password: data.new_password });
      setDone(true);
    } catch (err) {
      toast.error("Đặt lại thất bại", {
        description:
          err instanceof Error ? err.message : "Đường dẫn có thể đã hết hạn.",
      });
    }
  };

  if (done) {
    return (
      <AuthLayout
        title="Đã cập nhật mật khẩu"
        subtitle="Bạn có thể đăng nhập ngay bây giờ."
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="font-medium">Mật khẩu đã được đổi.</p>
          </div>
          <Button asChild className="w-full">
            <Link href="/login">Tiếp tục đăng nhập</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Chọn mật khẩu mới"
      subtitle="Hãy chọn mật khẩu bạn chưa từng dùng."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    autoFocus
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
                <FormLabel>Nhập lại mật khẩu</FormLabel>
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
            className="w-full gap-2"
            disabled={reset.isPending}
          >
            {reset.isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            Đặt lại mật khẩu
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
}
