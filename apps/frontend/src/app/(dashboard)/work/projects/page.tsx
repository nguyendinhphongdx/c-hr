import { ProjectListView } from "@/features/work";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "Dự án",
  path: "/work/projects",
  noIndex: true,
});

export default function ProjectsPage() {
  return <ProjectListView />;
}
