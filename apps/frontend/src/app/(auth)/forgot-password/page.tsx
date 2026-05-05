import { ForgotPasswordView } from "@/features/auth";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Quên mật khẩu",
  path: "/forgot-password",
  description: "Đặt lại mật khẩu qua email.",
});

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
