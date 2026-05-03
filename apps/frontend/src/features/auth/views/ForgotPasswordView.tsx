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
  email: z.string().email("Invalid email"),
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
      // Backend returns 200 for all outcomes to avoid email enumeration.
    }
    setSubmitted(data.email);
  };

  if (submitted) {
    return (
      <AuthLayout
        title="Check your inbox"
        subtitle={`If an account exists for ${submitted}, we've sent a reset link.`}
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">Reset link sent</p>
              <p className="text-xs">
                The link expires in 30 minutes. Check spam if you don&apos;t
                see it.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setSubmitted(null)}
          >
            Use a different email
          </Button>
          <Link
            href="/login"
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to reset it."
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
                    placeholder="you@example.com"
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
            Send reset link
          </Button>

          <Link
            href="/login"
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </form>
      </Form>
    </AuthLayout>
  );
}
