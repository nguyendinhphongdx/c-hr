import { LoginView } from "@/features/auth";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Đăng nhập",
  path: "/login",
  description: "Đăng nhập vào tài khoản C-HR của bạn.",
});

export default function LoginPage() {
  return <LoginView />;
}
