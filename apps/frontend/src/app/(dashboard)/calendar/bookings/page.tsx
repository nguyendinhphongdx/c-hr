import { CalendarView } from "@/features/calendar";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Lịch",
  path: "/calendar/bookings",
  noIndex: true,
});

export default function BookingsPage() {
  return <CalendarView />;
}
