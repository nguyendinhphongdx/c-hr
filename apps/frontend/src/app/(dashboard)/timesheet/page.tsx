import { TimesheetView } from "@/features/timesheet";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Bảng giờ làm",
  path: "/timesheet",
  noIndex: true,
});

export default function TimesheetPage() {
  return <TimesheetView />;
}
