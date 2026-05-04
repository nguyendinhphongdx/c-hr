"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
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
import { cn } from "@/lib/utils";
import { useRegister } from "../hooks/useAuth";
import { SocialAuthButtons } from "./SocialAuthButtons";

const schema = z.object({
  full_name: z.string().min(1, "Required").max(100),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

export function RegisterForm() {
  const register = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", email: "", password: "" },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await register.mutateAsync(data);
    } catch (err) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      toast.error("Couldn't create account", {
        description:
          err instanceof Error
            ? err.message
            : "Email may already be in use.",
      });
    }
  };

  return (
    <div className="space-y-5">
      <SocialAuthButtons />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
          <span className="bg-background px-2 text-muted-foreground">
            Or sign up with email
          </span>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn("space-y-4", shake && "animate-shake")}
        >
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ada Lovelace"
                    autoComplete="name"
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      className="pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {register.error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              Registration failed. Email may already be in use.
            </div>
          )}

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={register.isPending}
          >
            {register.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-foreground hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </Form>
    </div>
  );
}
