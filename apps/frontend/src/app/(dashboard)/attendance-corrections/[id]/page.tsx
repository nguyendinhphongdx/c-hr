import { CorrectionDetailView } from "@/features/attendance-correction";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Chi tiết đơn quên chấm",
  path: "/attendance-corrections",
  noIndex: true,
});

export default async function CorrectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CorrectionDetailView id={id} />;
}
