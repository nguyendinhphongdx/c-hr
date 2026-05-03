import { Suspense } from "react";
import { ResetPasswordView } from "@/features/auth";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Reset password",
  path: "/reset-password",
  noIndex: true,
});

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordView />
    </Suspense>
  );
}
