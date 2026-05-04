import { EmployeeEditView } from "@/features/employees";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Edit employee",
  path: "/employees",
  noIndex: true,
});

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EmployeeEditView id={id} />;
}
