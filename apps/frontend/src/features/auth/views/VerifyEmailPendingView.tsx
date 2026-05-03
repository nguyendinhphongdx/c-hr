"use client";

import { Loader2, Mail, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AuthLayout } from "../components/AuthLayout";
import {
  useAuth,
  useLogout,
  useResendVerification,
} from "../hooks/useAuth";

export function VerifyEmailPendingView() {
  const { user } = useAuth();
  const resend = useResendVerification();
  const logout = useLogout();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    try {
      await resend.mutateAsync();
      toast.success("Verification email sent");
      setCooldown(30);
    } catch {
      toast.error("Could not send verification email");
    }
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={
        user?.email
          ? `We sent a verification link to ${user.email}.`
          : "Check your inbox for the verification link."
      }
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            Click the link in the email to activate your account. If you
            don&apos;t see it, check your spam folder.
          </p>
        </div>

        <Button
          onClick={handleResend}
          disabled={resend.isPending || cooldown > 0}
          className="w-full gap-2"
          variant="outline"
        >
          {resend.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}
        </Button>

        <button
          type="button"
          onClick={() => logout.mutate()}
          className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Use a different account
        </button>
      </div>
    </AuthLayout>
  );
}
