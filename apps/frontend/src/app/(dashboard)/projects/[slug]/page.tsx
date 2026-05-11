import { ProjectDetailView } from "@/features/work";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "Dự án",
  path: "/projects",
  noIndex: true,
});

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProjectDetailView slug={slug} />;
}
