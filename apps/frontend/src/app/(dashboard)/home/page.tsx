import { HomeView } from "@/features/dashboard";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Home",
  path: "/home",
  noIndex: true,
});

export default function HomePage() {
  return <HomeView />;
}
