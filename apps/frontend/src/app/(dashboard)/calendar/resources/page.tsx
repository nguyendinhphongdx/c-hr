import { ResourcesAdminView } from "@/features/calendar";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Tài nguyên",
  path: "/calendar/resources",
  noIndex: true,
});

export default function ResourcesPage() {
  return <ResourcesAdminView />;
}
