"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
import { useLogin } from "../hooks/useAuth";
import { SocialAuthButtons } from "./SocialAuthButtons";

const LAST_EMAIL_KEY = "auth:lastEmail";
const REMEMBER_ME_KEY = "auth:rememberMe";

function readRemembered() {
  if (typeof window === "undefined") return { email: "", rememberMe: false };
  const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === "1";
  return {
    email: rememberMe ? (localStorage.getItem(LAST_EMAIL_KEY) ?? "") : "",
    rememberMe,
  };
}

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [remembered] = useState(readRemembered);
  const [rememberMe, setRememberMe] = useState(remembered.rememberMe);
  const [shake, setShake] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: remembered.email, password: "" },
  });

  // Cmd/Ctrl+Enter submits — handy when the user is reviewing values.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const onSubmit = async (data: FormValues) => {
    if (typeof window !== "undefined") {
      if (rememberMe) {
        localStorage.setItem(LAST_EMAIL_KEY, data.email);
        localStorage.setItem(REMEMBER_ME_KEY, "1");
      } else {
        localStorage.removeItem(LAST_EMAIL_KEY);
        localStorage.removeItem(REMEMBER_ME_KEY);
      }
    }
    try {
      await login.mutateAsync(data);
    } catch (err) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      toast.error("Đăng nhập thất bại", {
        description:
          err instanceof Error
            ? err.message
            : "Kiểm tra lại email và mật khẩu rồi thử lại.",
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
            Hoặc đăng nhập bằng email
          </span>
        </div>
      </div>

      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn("space-y-4", shake && "animate-shake")}
        >
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

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Mật khẩu</FormLabel>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Nhập mật khẩu"
                      autoComplete="current-password"
                      className="pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
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

          <label className="flex cursor-pointer select-none items-center gap-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer rounded border-border text-primary focus:ring-primary/30"
            />
            <span className="text-xs text-muted-foreground">
              Ghi nhớ trên thiết bị này
            </span>
          </label>

          {login.error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              Email hoặc mật khẩu không đúng
            </div>
          )}

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={login.isPending}
          >
            {login.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang đăng nhập…
              </>
            ) : (
              "Đăng nhập"
            )}
          </Button>

          <p className="text-center text-[10px] text-muted-foreground/70">
            Nhấn{" "}
            <kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[9px]">
              ⌘
            </kbd>{" "}
            +{" "}
            <kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[9px]">
              Enter
            </kbd>{" "}
            để đăng nhập
          </p>

          <p className="text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{" "}
            <Link
              href="/register"
              className="font-medium text-foreground hover:underline"
            >
              Tạo Org mới
            </Link>
          </p>
        </form>
      </Form>
    </div>
  );
}
