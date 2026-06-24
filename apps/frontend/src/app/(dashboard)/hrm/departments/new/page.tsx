import { DepartmentCreateView } from "@/features/departments";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Thêm phòng ban",
  path: "/hrm/departments/new",
  noIndex: true,
});

export default function NewDepartmentPage() {
  return <DepartmentCreateView />;
}
