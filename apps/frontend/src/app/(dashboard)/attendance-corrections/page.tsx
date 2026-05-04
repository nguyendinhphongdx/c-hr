import { CorrectionListView } from "@/features/attendance-correction";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Attendance Corrections",
  path: "/attendance-corrections",
  noIndex: true,
});

export default function CorrectionsPage() {
  return <CorrectionListView />;
}
