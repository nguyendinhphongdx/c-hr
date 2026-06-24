import { RoomsView } from "@/features/calendar";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Phòng họp",
  path: "/calendar/rooms",
  noIndex: true,
});

export default function RoomsPage() {
  return <RoomsView />;
}
