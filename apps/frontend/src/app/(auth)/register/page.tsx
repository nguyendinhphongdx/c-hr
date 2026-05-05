import { RegisterView } from "@/features/auth";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Tạo tài khoản",
  path: "/register",
  description: "Tạo Org cho doanh nghiệp của bạn trong vài phút.",
});

export default function RegisterPage() {
  return <RegisterView />;
}
