"use client";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { MicrosoftIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

import { useStartEntra } from "../hooks/useSsoConfig";

interface MicrosoftLoginButtonProps {
  /** Optional path inside the FE to land on after SSO. Default = /home. */
  returnTo?: string;
  className?: string;
}

export function MicrosoftLoginButton({
  returnTo,
  className,
}: MicrosoftLoginButtonProps) {
  const start = useStartEntra();

  const onClick = async () => {
    try {
      const { authorizeUrl } = await start.mutateAsync({ returnTo });
      if (typeof window !== "undefined") {
        window.location.href = authorizeUrl;
      }
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ??
          "Không khởi tạo được phiên SSO — kiểm tra cấu hình Microsoft với admin hệ thống",
      );
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={start.isPending}
      className={className}
    >
      {start.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <MicrosoftIcon className="mr-2 h-4 w-4" />
      )}
      Đăng nhập với Microsoft
    </Button>
  );
}
