import { LeaveListView } from "@/features/leave";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Leave Requests",
  path: "/leave",
  noIndex: true,
});

export default function LeavePage() {
  return <LeaveListView />;
}
