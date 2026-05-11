import { MyTasksView } from "@/features/work";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Việc của tôi",
  path: "/my-tasks",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default function MyTasksPage() {
  return <MyTasksView />;
}
