import { EmployeeListView } from "@/features/employees";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Nhân sự",
  path: "/hrm/employees",
  noIndex: true,
});

export default function EmployeesPage() {
  return <EmployeeListView />;
}
