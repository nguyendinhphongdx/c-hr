import { OnboardingDetailView } from "@/features/onboarding";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "Onboarding",
  path: "/onboarding",
  noIndex: true,
});

export default async function OnboardingDetailPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  return <OnboardingDetailView planId={planId} />;
}
