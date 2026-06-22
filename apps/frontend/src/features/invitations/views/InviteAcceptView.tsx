"use client";

import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MicrosoftLoginButton } from "@/features/sso";
import { cn } from "@/lib/utils";

import { useAcceptByToken, useInvitationByToken } from "../hooks/useInvitations";

interface InviteAcceptViewProps {
  token: string;
}

export function InviteAcceptView({ token }: InviteAcceptViewProps) {
  const router = useRouter();
  const { data, isLoading, error } = useInvitationByToken(token);
  const accept = useAcceptByToken();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");

  if (isLoading) {
    return <Frame><LoaderRow /></Frame>;
  }

  if (error || !data?.invitation) {
    return (
      <Frame>
        <Card className="border-rose-200 bg-rose-50/30">
          <CardHeader>
            <CardTitle className="text-base">Lời mời không hợp lệ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Link bạn đang truy cập đã hết hạn, đã được sử dụng, hoặc bị huỷ.
              Liên hệ admin để được mời lại.
            </p>
            <Button asChild variant="outline">
              <Link href="/login">Về trang đăng nhập</Link>
            </Button>
          </CardContent>
        </Card>
      </Frame>
    );
  }

  const inv = data.invitation;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Mật khẩu cần ít nhất 6 ký tự");
      return;
    }
    if (password !== confirm) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    try {
      await accept.mutateAsync({
        token,
        input: { password, name: name.trim() || undefined },
      });
      toast.success(`Chào mừng vào ${inv.organizationName}!`);
      router.push("/home");
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Kích hoạt thất bại",
      );
    }
  };

  return (
    <Frame>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Tham gia {inv.organizationName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 text-sm">
            <div className="text-muted-foreground">Bạn được mời với email</div>
            <div className="font-medium">{inv.email}</div>
            {inv.message && (
              <blockquote className="mt-2 border-l-2 border-border pl-3 text-xs italic text-muted-foreground">
                {inv.message}
              </blockquote>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Cách 1 — Đăng nhập với Microsoft
            </div>
            <p className="text-[11px] text-muted-foreground">
              Nếu email của bạn đã có tài khoản Microsoft 365 (Office), click
              bên dưới — hệ thống tự động kích hoạt lời mời sau khi xác thực.
            </p>
            <MicrosoftLoginButton className="w-full" returnTo="/home" />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
              <span className="bg-background px-2 text-muted-foreground">hoặc</span>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Cách 2 — Đặt mật khẩu
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-accept-name">
                Tên hiển thị{" "}
                <span className="text-xs text-muted-foreground">
                  {inv.name ? "(tuỳ chọn — admin đặt sẵn)" : "(tuỳ chọn)"}
                </span>
              </Label>
              <Input
                id="invite-accept-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={inv.name ?? "vd: Nguyễn Văn Tuấn"}
                disabled={accept.isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-accept-pw">Mật khẩu mới</Label>
              <Input
                id="invite-accept-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
                minLength={6}
                maxLength={72}
                required
                disabled={accept.isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-accept-confirm">Xác nhận mật khẩu</Label>
              <Input
                id="invite-accept-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={accept.isPending}
              />
            </div>
            <Button type="submit" disabled={accept.isPending} className="w-full">
              {accept.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              Kích hoạt và đăng nhập
            </Button>
          </form>
        </CardContent>
      </Card>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8")}>
      {children}
    </div>
  );
}

function LoaderRow() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Đang kiểm tra lời mời…
    </div>
  );
}
