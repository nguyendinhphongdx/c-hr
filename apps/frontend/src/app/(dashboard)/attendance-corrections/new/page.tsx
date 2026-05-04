import { CorrectionCreateView } from "@/features/attendance-correction";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Tạo đơn quên chấm",
  path: "/attendance-corrections/new",
  noIndex: true,
});

export default function CorrectionCreatePage() {
  return <CorrectionCreateView />;
}
