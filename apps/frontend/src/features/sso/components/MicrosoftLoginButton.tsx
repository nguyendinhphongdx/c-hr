"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { MicrosoftIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useStartEntra } from "../hooks/useSsoConfig";

interface MicrosoftLoginButtonProps {
  /** Optional path inside the FE to land on after SSO. Default = /home. */
  returnTo?: string;
}

const SLUG_STORAGE_KEY = "c-hr.sso.lastOrgSlug";

export function MicrosoftLoginButton({ returnTo }: MicrosoftLoginButtonProps) {
  const start = useStartEntra();
  const [orgSlug, setOrgSlug] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(SLUG_STORAGE_KEY) ?? "";
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = orgSlug.trim().toLowerCase();
    if (!slug) {
      toast.error("Nhập slug doanh nghiệp (vd: cmc)");
      return;
    }
    try {
      const { authorizeUrl } = await start.mutateAsync({ orgSlug: slug, returnTo });
      if (typeof window !== "undefined") {
        localStorage.setItem(SLUG_STORAGE_KEY, slug);
        window.location.href = authorizeUrl;
      }
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ??
          "Không khởi tạo được phiên SSO — kiểm tra slug doanh nghiệp",
      );
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="grid gap-1.5">
        <Label htmlFor="sso-org-slug" className="text-xs">
          Slug doanh nghiệp
        </Label>
        <Input
          id="sso-org-slug"
          value={orgSlug}
          onChange={(e) => setOrgSlug(e.target.value)}
          placeholder="vd: cmc"
          autoComplete="organization"
          disabled={start.isPending}
        />
      </div>
      <Button
        type="submit"
        variant="outline"
        className="w-full"
        disabled={start.isPending}
      >
        {start.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <MicrosoftIcon className="mr-2 h-4 w-4" />
        )}
        Đăng nhập với Microsoft
      </Button>
    </form>
  );
}
