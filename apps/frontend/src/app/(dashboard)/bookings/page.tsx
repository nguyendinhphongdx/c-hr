import { BookingsView } from "@/features/bookings";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Đặt lịch",
  path: "/bookings",
  noIndex: true,
});

export default function BookingsPage() {
  return <BookingsView />;
}
