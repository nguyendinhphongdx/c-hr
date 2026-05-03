import { LandingView } from "@/features/landing";
import { createMetadata, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

export const metadata = createMetadata({ path: "/" });

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
      />
      <LandingView />
    </>
  );
}
