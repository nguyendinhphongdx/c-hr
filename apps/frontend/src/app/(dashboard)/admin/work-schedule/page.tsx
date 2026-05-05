import { WorkScheduleSettingsView } from "@/features/work-schedule";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Ca làm chuẩn",
  path: "/admin/work-schedule",
  noIndex: true,
});

export default function WorkSchedulePage() {
  return <WorkScheduleSettingsView />;
}
