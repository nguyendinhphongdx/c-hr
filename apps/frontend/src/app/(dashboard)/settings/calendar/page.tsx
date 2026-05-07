import { CalendarSettingsView } from "@/features/settings";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Lịch & Chia sẻ",
  path: "/settings/calendar",
  noIndex: true,
});

export default function CalendarSettingsPage() {
  return <CalendarSettingsView />;
}
