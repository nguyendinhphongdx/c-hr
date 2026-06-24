import { DepartmentEditView } from "@/features/departments";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Sửa phòng ban",
  path: "/hrm/departments",
  noIndex: true,
});

export default async function EditDepartmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DepartmentEditView id={id} />;
}
