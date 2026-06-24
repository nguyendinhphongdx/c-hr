import { TimesheetReportsView } from "@/features/timesheet";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Báo cáo chấm công",
  path: "/attendance/timesheet/reports",
  noIndex: true,
});

export default function TimesheetReportsPage() {
  return <TimesheetReportsView />;
}
