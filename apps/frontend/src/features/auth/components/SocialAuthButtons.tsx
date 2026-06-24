"use client";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { GoogleIcon, MicrosoftIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useStartEntra } from "@/features/sso";

import { oauthStartUrl } from "../services/authService";

export function SocialAuthButtons() {
  const startEntra = useStartEntra();

  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        disabled={startEntra.isPending}
        onClick={async () => {
          try {
            const { authorizeUrl } = await startEntra.mutateAsync({});
            window.location.href = authorizeUrl;
          } catch {
            toast.error("Không khởi tạo được phiên đăng nhập Microsoft");
          }
        }}
      >
        {startEntra.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MicrosoftIcon className="h-4 w-4" />
        )}
        Microsoft
      </Button>
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        onClick={() => {
          window.location.href = oauthStartUrl("google");
        }}
      >
        <GoogleIcon className="h-4 w-4" />
        Google
      </Button>
    </div>
  );
}
