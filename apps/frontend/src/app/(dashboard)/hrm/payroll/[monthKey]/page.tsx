import { PayrollDetailView } from "@/features/payroll";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "Bảng lương",
  path: "/hrm/payroll",
  noIndex: true,
});

export default async function PayrollDetailPage({
  params,
}: {
  params: Promise<{ monthKey: string }>;
}) {
  const { monthKey } = await params;
  return <PayrollDetailView monthKey={monthKey} />;
}
