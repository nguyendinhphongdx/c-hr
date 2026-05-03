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
    new_password: z.string().min(8, "Use at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords don't match",
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
        title="Invalid reset link"
        subtitle="Open the link from your email, or request a new one."
      >
        <Button asChild className="w-full">
          <Link href="/forgot-password">Request new link</Link>
        </Button>
      </AuthLayout>
    );
  }

  const onSubmit = async (data: FormValues) => {
    try {
      await reset.mutateAsync({ token, new_password: data.new_password });
      setDone(true);
    } catch (err) {
      toast.error("Reset failed", {
        description:
          err instanceof Error ? err.message : "The link may have expired.",
      });
    }
  };

  if (done) {
    return (
      <AuthLayout title="Password updated" subtitle="You can now sign in.">
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="font-medium">Your password has been changed.</p>
          </div>
          <Button asChild className="w-full">
            <Link href="/login">Continue to sign in</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Pick something you haven't used before."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="new_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
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
                <FormLabel>Confirm password</FormLabel>
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
            Update password
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
}
