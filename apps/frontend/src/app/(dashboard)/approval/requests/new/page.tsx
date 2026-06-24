import { RequestCreateView } from "@/features/requests";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Tạo đơn",
  path: "/approval/requests/new",
  noIndex: true,
});

export default function RequestCreatePage() {
  return <RequestCreateView />;
}
