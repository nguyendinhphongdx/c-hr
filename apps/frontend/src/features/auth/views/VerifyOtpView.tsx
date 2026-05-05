"use client";

import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import { AuthLayout } from "../components/AuthLayout";
import { useResendOtp, useVerifyOtp } from "../hooks/useAuth";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

interface VerifyOtpViewProps {
  /**
   * Where the OTP was sent — shown to the user as confirmation.
   * Channel-agnostic (email or SMS); the BE decides how to route it.
   */
  destination?: string;
}

export function VerifyOtpView({ destination }: VerifyOtpViewProps) {
  const verify = useVerifyOtp();
  const resend = useResendOtp();
  const [code, setCode] = useState("");
  const [shake, setShake] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Auto-submit the moment we have a full code; shake + reset on failure.
  useEffect(() => {
    if (code.length !== OTP_LENGTH || verify.isPending) return;
    verify.mutate(
      { code },
      {
        onError: () => {
          setShake(true);
          setTimeout(() => {
            setShake(false);
            setCode("");
          }, 500);
        },
      },
    );
  }, [code, verify]);

  // Countdown timer for the resend button.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleResend = async () => {
    try {
      await resend.mutateAsync();
      toast.success("Đã gửi mã mới", {
        description: destination
          ? `Hãy kiểm tra ${destination} để xem mã mới.`
          : "Hãy kiểm tra hộp thư để xem mã mới.",
      });
      setCode("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      toast.error("Không gửi lại được mã", {
        description:
          err instanceof Error ? err.message : "Vui lòng thử lại sau.",
      });
    }
  };

  return (
    <AuthLayout
      title="Xác minh mã OTP"
      subtitle={
        destination
          ? `Chúng tôi đã gửi mã 6 chữ số đến ${destination}.`
          : "Nhập mã 6 chữ số vừa được gửi cho bạn."
      }
    >
      <div className="space-y-6" ref={wrapperRef}>
        <div className={cn("flex justify-center", shake && "animate-shake")}>
          <InputOTP
            maxLength={OTP_LENGTH}
            value={code}
            onChange={setCode}
            disabled={verify.isPending}
            autoFocus
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        {verify.error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-center text-sm text-destructive">
            Mã không đúng. Vui lòng thử lại.
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-sm">
          {verify.isPending ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Đang xác minh…
            </span>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={handleResend}
              disabled={cooldown > 0 || resend.isPending}
            >
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5",
                  resend.isPending && "animate-spin",
                )}
              />
              {cooldown > 0
                ? `Gửi lại sau ${cooldown}s`
                : resend.isPending
                  ? "Đang gửi…"
                  : "Gửi lại mã"}
            </Button>
          )}
        </div>

        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Quay lại đăng nhập
        </Link>
      </div>
    </AuthLayout>
  );
}
