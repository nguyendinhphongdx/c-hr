import { OnboardingListView } from "@/features/onboarding";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "Onboarding",
  path: "/onboarding",
  noIndex: true,
});

export default function OnboardingPage() {
  return <OnboardingListView />;
}
