import { createMetadata } from "@/lib/seo";

import { OnboardingSettingsView } from "./view";

export const metadata = createMetadata({
  title: "Mẫu onboarding",
  path: "/settings/onboarding",
  noIndex: true,
});

export default function OnboardingSettingsPage() {
  return <OnboardingSettingsView />;
}
