import { WorkScheduleSettingsView } from "@/features/work-schedule";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Work schedule",
  path: "/admin/work-schedule",
  noIndex: true,
});

export default function WorkSchedulePage() {
  return <WorkScheduleSettingsView />;
}
