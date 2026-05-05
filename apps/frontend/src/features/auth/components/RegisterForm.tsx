"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

import { useSignupOrg } from "../hooks/useAuth";

/** Slugify a string the way humans expect — lowercase, dash-separated,
 * stripped of accents and non-alphanumerics. */
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

const schema = z.object({
  organizationName: z.string().min(2, "Tối thiểu 2 ký tự").max(100),
  slug: z
    .string()
    .min(3, "Tối thiểu 3 ký tự")
    .max(50, "Tối đa 50 ký tự")
    .regex(/^[a-z0-9-]+$/, "Chỉ dùng chữ thường, số và dấu gạch ngang"),
  adminName: z.string().min(1, "Bắt buộc").max(100),
  adminEmail: z.string().email("Email không hợp lệ"),
  adminPassword: z.string().min(8, "Ít nhất 8 ký tự"),
});

type FormValues = z.infer<typeof schema>;

export function RegisterForm() {
  const signup = useSignupOrg();
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationName: "",
      slug: "",
      adminName: "",
      adminEmail: "",
      adminPassword: "",
    },
  });

  // Keep slug in sync with org name until the user edits slug manually.
  const organizationName = useWatch({
    control: form.control,
    name: "organizationName",
  });
  useEffect(() => {
    if (slugTouched) return;
    const next = slugify(organizationName);
    if (next !== form.getValues("slug")) {
      form.setValue("slug", next, { shouldValidate: organizationName.length > 0 });
    }
  }, [organizationName, slugTouched, form]);

  const onSubmit = async (data: FormValues) => {
    try {
      await signup.mutateAsync(data);
    } catch (err) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      toast.error("Không tạo được Org", {
        description:
          err instanceof Error
            ? err.message
            : "Slug hoặc email có thể đã được dùng.",
      });
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("space-y-4", shake && "animate-shake")}
      >
        <FormField
          control={form.control}
          name="organizationName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên doanh nghiệp</FormLabel>
              <FormControl>
                <Input placeholder="Công ty TNHH ABC" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mã định danh (slug)</FormLabel>
              <FormControl>
                <Input
                  placeholder="cong-ty-abc"
                  autoComplete="off"
                  {...field}
                  onChange={(e) => {
                    setSlugTouched(true);
                    field.onChange(e);
                  }}
                />
              </FormControl>
              <FormDescription>
                Dùng trong URL. Chỉ chữ thường, số và dấu gạch ngang.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="adminName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Họ và tên</FormLabel>
              <FormControl>
                <Input
                  placeholder="Nguyễn Văn A"
                  autoComplete="name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="adminEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email công ty</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="ban@congty.vn"
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
          name="adminPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mật khẩu</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Ít nhất 8 ký tự"
                    autoComplete="new-password"
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

        {signup.error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            Không tạo được Org. Slug hoặc email có thể đã được dùng.
          </div>
        )}

        <Button type="submit" className="w-full gap-2" disabled={signup.isPending}>
          {signup.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Đang tạo Org…
            </>
          ) : (
            "Tạo Org"
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Đã có tài khoản?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground hover:underline"
          >
            Đăng nhập
          </Link>
        </p>
      </form>
    </Form>
  );
}
