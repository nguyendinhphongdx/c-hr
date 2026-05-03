import { ForgotPasswordView } from "@/features/auth";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Forgot password",
  path: "/forgot-password",
  description: "Reset your password by email.",
});

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
