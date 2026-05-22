import { IntegrationsSettingsView } from "@/features/recruitment/views/IntegrationsSettingsView";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "Tuyển dụng — Kết nối job board",
  path: "/recruitment/integrations",
  noIndex: true,
});

export default function RecruitmentIntegrationsPage() {
  return <IntegrationsSettingsView />;
}
