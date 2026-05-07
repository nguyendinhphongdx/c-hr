import { SchedulingAssistantView } from "@/features/calendar";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Tìm khung trống",
  path: "/calendar/schedule",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default function ScheduleAssistantPage() {
  return <SchedulingAssistantView />;
}
