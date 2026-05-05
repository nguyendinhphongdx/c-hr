import { VerifyEmailPendingView } from "@/features/auth";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Xác minh email",
  path: "/verify-email/pending",
  noIndex: true,
});

export default function VerifyEmailPendingPage() {
  return <VerifyEmailPendingView />;
}
