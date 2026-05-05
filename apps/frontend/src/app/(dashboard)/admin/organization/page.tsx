import { OrganizationSettingsView } from "@/features/organization";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Doanh nghiệp",
  path: "/admin/organization",
  noIndex: true,
});

export default function OrganizationSettingsPage() {
  return <OrganizationSettingsView />;
}
