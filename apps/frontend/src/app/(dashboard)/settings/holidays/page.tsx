import { createMetadata } from "@/lib/seo";

import { HolidaysSettingsView } from "./view";

export const metadata = createMetadata({
  title: "Ngày lễ",
  path: "/settings/holidays",
  noIndex: true,
});

export default function HolidaysSettingsPage() {
  return <HolidaysSettingsView />;
}
