import { DepartmentTreeView } from "@/features/departments";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Departments",
  path: "/departments",
  noIndex: true,
});

export default function DepartmentsPage() {
  return <DepartmentTreeView />;
}
