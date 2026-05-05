import { AuthLayout } from "../components/AuthLayout";
import { RegisterForm } from "../components/RegisterForm";

export function RegisterView() {
  return (
    <AuthLayout
      title="Tạo Org cho doanh nghiệp"
      subtitle="Khởi tạo trong chưa đầy một phút. Không cần thẻ ngân hàng."
    >
      <RegisterForm />
    </AuthLayout>
  );
}
