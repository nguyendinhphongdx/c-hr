import { JobListView } from "@/features/recruitment";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "Tuyển dụng — Jobs",
  path: "/recruitment/jobs",
  noIndex: true,
});

export default function JobsPage() {
  return <JobListView />;
}
