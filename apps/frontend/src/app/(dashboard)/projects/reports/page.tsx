import { WorkOverviewPanel } from "@/features/work";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Báo cáo dự án",
  path: "/projects/reports",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default function ProjectReportsPage() {
  return <WorkOverviewPanel />;
}
