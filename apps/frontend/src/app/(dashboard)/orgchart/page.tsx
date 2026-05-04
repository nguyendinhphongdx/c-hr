import { OrgChartView } from "@/features/orgchart";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "OrgChart",
  path: "/orgchart",
  noIndex: true,
});

export default function OrgChartPage() {
  return <OrgChartView />;
}
