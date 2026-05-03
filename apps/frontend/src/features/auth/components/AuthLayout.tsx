"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Sparkles } from "lucide-react";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { SITE } from "@/lib/seo";
import { useAuth } from "../hooks/useAuth";
import { BrandPanel } from "./BrandPanel";

const VERIFY_PENDING_PATH = "/verify-email/pending";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Shared layout for `/login`, `/register`, `/forgot-password`, etc.
 *
 * Behavior: if a verified user lands on any auth page, bounce them to /home.
 * Unverified users are sent to /verify-email/pending (unless that's where
 * they already are). The actual redirect is server-gated by middleware.ts;
 * this client effect is the secondary safety net + provides snappier UX.
 */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;
    if (user.is_verified) {
      router.replace("/home");
    } else if (pathname !== VERIFY_PENDING_PATH) {
      router.replace(VERIFY_PENDING_PATH);
    }
  }, [isLoading, isAuthenticated, user, pathname, router]);

  return (
    <div className="relative flex min-h-screen">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      {/* Left: branding panel — desktop only */}
      <div className="hidden lg:block lg:w-1/2">
        <div className="sticky top-0 h-screen">
          <BrandPanel />
        </div>
      </div>

      {/* Right: form column */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16">
        <div className="mx-auto w-full max-w-[400px]">
          {/* Mobile-only logo (BrandPanel is hidden on mobile) */}
          <Link
            href="/"
            className="animate-fade-up mb-10 flex items-center gap-2.5 lg:hidden"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              {SITE.name}
            </span>
          </Link>

          <div
            className="animate-fade-up mb-8"
            style={{ animationDelay: "100ms" }}
          >
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>

          <div
            className="animate-fade-up"
            style={{ animationDelay: "200ms" }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
