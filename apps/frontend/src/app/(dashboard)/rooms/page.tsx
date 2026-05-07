import { RoomsView } from "@/features/calendar";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Phòng họp",
  path: "/rooms",
  noIndex: true,
});

export default function RoomsPage() {
  return <RoomsView />;
}
