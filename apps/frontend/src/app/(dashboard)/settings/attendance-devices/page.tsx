import { AttendanceDevicesView } from "@/features/attendance-devices";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Attendance devices",
  path: "/settings/attendance-devices",
  noIndex: true,
});

export default function AttendanceDevicesPage() {
  return <AttendanceDevicesView />;
}
