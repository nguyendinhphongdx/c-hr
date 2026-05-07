"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/features/auth";

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * Client-side guard for the (dashboard) group. While the BE/FE live on
 * different domains and the edge middleware is disabled, this is the only
 * auth gate. Captures the current path as `?next=` so the user lands back
 * where they were after login.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) return;
    const search = searchParams.toString();
    const here = search ? `${pathname}?${search}` : pathname;
    const url = `/login?next=${encodeURIComponent(here)}`;
    router.replace(url);
  }, [isLoading, isAuthenticated, pathname, router, searchParams]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
