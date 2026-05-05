"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Root error boundary. Next.js renders this when an unhandled error bubbles
 * up from any nested route segment. Keep it minimal — segment-specific
 * boundaries can be added under each `(group)/error.tsx` if needed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[GlobalError]", error);
    }
    // Hook your monitoring (Sentry, etc.) here.
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Đã có lỗi xảy ra</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {error.message || "Có lỗi không mong muốn vừa xảy ra."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/70">
            Mã lỗi: <span className="font-mono">{error.digest}</span>
          </p>
        )}
      </div>
      <Button onClick={reset}>Thử lại</Button>
    </div>
  );
}
