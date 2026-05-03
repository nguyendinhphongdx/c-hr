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

  // Auto-submit the moment we have a full code.
  useEffect(() => {
    if (code.length !== OTP_LENGTH || verify.isPending) return;
    verify.mutate({ code });
  }, [code, verify]);

  // Shake on bad code, then clear so the user can re-enter.
  useEffect(() => {
    if (!verify.error) return;
    setShake(true);
    const t = setTimeout(() => {
      setShake(false);
      setCode("");
    }, 500);
    return () => clearTimeout(t);
  }, [verify.error]);

  // Countdown timer for the resend button.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleResend = async () => {
    try {
      await resend.mutateAsync();
      toast.success("New code sent", {
        description: destination
          ? `Check ${destination} for the latest code.`
          : "Check your inbox for the latest code.",
      });
      setCode("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      toast.error("Couldn't resend code", {
        description: err instanceof Error ? err.message : "Try again shortly.",
      });
    }
  };

  return (
    <AuthLayout
      title="Verify your code"
      subtitle={
        destination
          ? `We sent a 6-digit code to ${destination}.`
          : "Enter the 6-digit code we just sent you."
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
            That code didn&apos;t match. Try again.
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-sm">
          {verify.isPending ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Verifying…
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
                ? `Resend in ${cooldown}s`
                : resend.isPending
                  ? "Sending…"
                  : "Resend code"}
            </Button>
          )}
        </div>

        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
