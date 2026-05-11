import { MyOnboardingView } from "@/features/onboarding";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "Việc onboard của tôi",
  path: "/my-onboarding",
  noIndex: true,
});

export default function MyOnboardingPage() {
  return <MyOnboardingView />;
}
