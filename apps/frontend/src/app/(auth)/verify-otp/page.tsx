import { Suspense } from "react";

import { VerifyOtpView } from "@/features/auth";
import { createMetadata } from "@/lib/seo";
import { VerifyOtpRouteHandler } from "./VerifyOtpRouteHandler";

export const metadata = createMetadata({
  title: "Verify your code",
  path: "/verify-otp",
  description: "Enter the 6-digit verification code we sent you.",
  noIndex: true,
});

/**
 * `Suspense` boundary is required because the inner component reads
 * `useSearchParams()` (Next App Router rule for `useSearchParams` in client
 * components used in static / streamed pages).
 */
export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<VerifyOtpView />}>
      <VerifyOtpRouteHandler />
    </Suspense>
  );
}
