"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/features/auth";

interface AuthGuardProps {
  children: ReactNode;
  /** When true, an unverified user is sent to /verify-email/pending. */
  requireVerified?: boolean;
}

export function AuthGuard({ children, requireVerified = true }: AuthGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (requireVerified && user && !user.is_verified) {
      router.replace("/verify-email/pending");
    }
  }, [isLoading, isAuthenticated, user, requireVerified, router]);

  if (isLoading || !isAuthenticated || (requireVerified && !user?.is_verified)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
