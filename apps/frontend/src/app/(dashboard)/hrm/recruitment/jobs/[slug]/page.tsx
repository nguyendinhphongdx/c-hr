import { JobDetailView } from "@/features/recruitment/views/JobDetailView";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "Chi tiết job",
  path: "/hrm/recruitment/jobs",
  noIndex: true,
});

interface JobDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { slug } = await params;
  return <JobDetailView slug={slug} />;
}
