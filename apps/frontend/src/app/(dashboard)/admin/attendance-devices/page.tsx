import { AttendanceDevicesView } from "@/features/attendance-devices";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Máy chấm công",
  path: "/admin/attendance-devices",
  noIndex: true,
});

export default function AttendanceDevicesPage() {
  return <AttendanceDevicesView />;
}
