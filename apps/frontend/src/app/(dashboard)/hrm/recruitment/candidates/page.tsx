import { CandidateListView } from "@/features/recruitment/views/CandidateListView";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "Tuyển dụng — Ứng viên",
  path: "/hrm/recruitment/candidates",
  noIndex: true,
});

export default function CandidatesPage() {
  return <CandidateListView />;
}
