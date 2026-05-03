import { ProfileView } from "@/features/settings";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Profile",
  path: "/settings/profile",
  noIndex: true,
});

export default function ProfilePage() {
  return <ProfileView />;
}
