import { TimesheetView } from "@/features/timesheet";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Bảng chấm công",
  path: "/attendance/timesheet",
  noIndex: true,
});

export default function TimesheetPage() {
  return <TimesheetView />;
}
