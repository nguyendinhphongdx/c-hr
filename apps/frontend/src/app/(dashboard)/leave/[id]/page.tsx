import { LeaveDetailView } from "@/features/leave";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Chi tiết đơn xin nghỉ",
  path: "/leave",
  noIndex: true,
});

export default async function LeaveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LeaveDetailView id={id} />;
}
