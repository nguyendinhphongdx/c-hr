import { TimesheetReportsView } from "@/features/timesheet";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Báo cáo chấm công",
  path: "/timesheet/reports",
  noIndex: true,
});

export default function TimesheetReportsPage() {
  return <TimesheetReportsView />;
}
