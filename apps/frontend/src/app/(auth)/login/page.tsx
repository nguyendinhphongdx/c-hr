import { LoginView } from "@/features/auth";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Sign in",
  path: "/login",
  description: "Sign in to your account.",
});

export default function LoginPage() {
  return <LoginView />;
}
