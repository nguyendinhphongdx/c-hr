import { AuthLayout } from "../components/AuthLayout";
import { RegisterForm } from "../components/RegisterForm";

export function RegisterView() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Get started in under a minute. No credit card required."
    >
      <RegisterForm />
    </AuthLayout>
  );
}
