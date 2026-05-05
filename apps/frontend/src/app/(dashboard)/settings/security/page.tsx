import { SecurityView } from "@/features/settings";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Bảo mật",
  path: "/settings/security",
  noIndex: true,
});

export default function SecurityPage() {
  return <SecurityView />;
}
