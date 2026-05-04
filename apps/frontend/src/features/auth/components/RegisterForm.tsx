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
  organizationName: z.string().min(2, "At least 2 characters").max(100),
  slug: z
    .string()
    .min(3, "At least 3 characters")
    .max(50, "Max 50 characters")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, digits, hyphens only"),
  adminName: z.string().min(1, "Required").max(100),
  adminEmail: z.string().email("Invalid email"),
  adminPassword: z.string().min(8, "Use at least 8 characters"),
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
      toast.error("Couldn't create organization", {
        description:
          err instanceof Error
            ? err.message
            : "Slug or email may already be taken.",
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
              <FormLabel>Organization name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Inc." autoFocus {...field} />
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
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input
                  placeholder="acme"
                  autoComplete="off"
                  {...field}
                  onChange={(e) => {
                    setSlugTouched(true);
                    field.onChange(e);
                  }}
                />
              </FormControl>
              <FormDescription>
                Used in URLs. Lowercase letters, digits, hyphens.
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
              <FormLabel>Your name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ada Lovelace"
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
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@acme.com"
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

        {signup.error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            Couldn&apos;t create organization. Slug or email may already be in use.
          </div>
        )}

        <Button type="submit" className="w-full gap-2" disabled={signup.isPending}>
          {signup.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Creating organization…
            </>
          ) : (
            "Create organization"
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
  );
}
