import { EmployeeDetailView } from "@/features/employees";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Employee",
  path: "/employees",
  noIndex: true,
});

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EmployeeDetailView id={id} />;
}
