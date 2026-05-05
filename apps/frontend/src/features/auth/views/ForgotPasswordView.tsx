"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { useForgotPassword } from "../hooks/useAuth";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordView() {
  const forgot = useForgotPassword();
  const [submitted, setSubmitted] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await forgot.mutateAsync(data);
    } catch {
      // BE trả 200 cho mọi kết quả để tránh dò email tồn tại.
    }
    setSubmitted(data.email);
  };

  if (submitted) {
    return (
      <AuthLayout
        title="Kiểm tra hộp thư"
        subtitle={`Nếu ${submitted} là tài khoản hợp lệ, chúng tôi đã gửi đường dẫn đặt lại mật khẩu.`}
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">Đã gửi đường dẫn đặt lại</p>
              <p className="text-xs">
                Đường dẫn hết hạn sau 30 phút. Nếu không thấy, hãy kiểm tra
                hộp thư rác.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setSubmitted(null)}
          >
            Dùng email khác
          </Button>
          <Link
            href="/login"
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại đăng nhập
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Đặt lại mật khẩu"
      subtitle="Nhập email của bạn và chúng tôi sẽ gửi đường dẫn đặt lại."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="ban@congty.vn"
                    autoComplete="email"
                    autoFocus
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
            disabled={forgot.isPending}
          >
            {forgot.isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            Gửi đường dẫn đặt lại
          </Button>

          <Link
            href="/login"
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại đăng nhập
          </Link>
        </form>
      </Form>
    </AuthLayout>
  );
}
