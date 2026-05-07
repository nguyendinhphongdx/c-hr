import { ResourcesAdminView } from "@/features/calendar";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Tài nguyên",
  path: "/admin/resources",
  noIndex: true,
});

export default function ResourcesAdminPage() {
  return <ResourcesAdminView />;
}
