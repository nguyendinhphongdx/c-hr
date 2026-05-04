import { RequestListView } from "@/features/requests";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Đơn từ",
  path: "/requests",
  noIndex: true,
});

export default function RequestsPage() {
  return <RequestListView />;
}
