import { PayrollListView } from "@/features/payroll";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "Bảng lương",
  path: "/payroll",
  noIndex: true,
});

export default function PayrollPage() {
  return <PayrollListView />;
}
