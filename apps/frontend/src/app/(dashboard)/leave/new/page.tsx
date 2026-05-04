import { LeaveCreateView } from "@/features/leave";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Tạo đơn xin nghỉ",
  path: "/leave/new",
  noIndex: true,
});

export default function LeaveCreatePage() {
  return <LeaveCreateView />;
}
