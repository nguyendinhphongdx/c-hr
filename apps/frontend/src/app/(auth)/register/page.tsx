import { RegisterView } from "@/features/auth";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Create account",
  path: "/register",
  description: "Create your free account in seconds.",
});

export default function RegisterPage() {
  return <RegisterView />;
}
