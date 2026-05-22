"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { AppLogo } from "@/components/icons";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useAuth } from "../hooks/useAuth";
import { readNextFromLocation } from "../utils/safeNext";
import { BrandPanel } from "./BrandPanel";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Shared layout for `/login`, `/register`, `/forgot-password`, etc.
 *
 * Behavior: an authenticated user who lands on any auth page is bounced to
 * /home. The real redirect is server-gated by middleware.ts; this client
 * effect is a secondary safety net for snappier UX.
 */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    router.replace(readNextFromLocation());
  }, [isLoading, isAuthenticated, router]);

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
            className="animate-fade-up mb-10 flex items-center lg:hidden"
          >
            <AppLogo height={36} priority />
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
