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
      toast.success("Đã gửi email xác minh");
      setCooldown(30);
    } catch {
      toast.error("Không gửi được email xác minh");
    }
  };

  return (
    <AuthLayout
      title="Xác minh email"
      subtitle={
        user?.email
          ? `Chúng tôi đã gửi đường dẫn xác minh đến ${user.email}.`
          : "Hãy kiểm tra hộp thư để mở đường dẫn xác minh."
      }
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            Bấm vào đường dẫn trong email để kích hoạt tài khoản. Nếu không
            thấy, hãy kiểm tra hộp thư rác.
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
          {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại email xác minh"}
        </Button>

        <button
          type="button"
          onClick={() => logout.mutate()}
          className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Đăng nhập tài khoản khác
        </button>
      </div>
    </AuthLayout>
  );
}
