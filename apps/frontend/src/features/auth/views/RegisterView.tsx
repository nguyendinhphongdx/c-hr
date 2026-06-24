import { AuthLayout } from "../components/AuthLayout";
import { RegisterForm } from "../components/RegisterForm";

export function RegisterView() {
  return (
    <AuthLayout
      title="Tạo Org cho doanh nghiệp"
      subtitle="Tính năng đăng ký tổ chức mới hiện đang tạm ngừng."
    >
      <RegisterForm />
    </AuthLayout>
  );
}
