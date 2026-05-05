import { ProfileView } from "@/features/settings";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Hồ sơ",
  path: "/settings/profile",
  noIndex: true,
});

export default function ProfilePage() {
  return <ProfileView />;
}
