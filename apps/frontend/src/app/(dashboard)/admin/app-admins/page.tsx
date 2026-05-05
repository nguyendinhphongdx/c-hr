import { AppAdminsSettingsView } from "@/features/app-admins";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "App admins",
  path: "/admin/app-admins",
  noIndex: true,
});

export default function AppAdminsSettingsPage() {
  return <AppAdminsSettingsView />;
}
