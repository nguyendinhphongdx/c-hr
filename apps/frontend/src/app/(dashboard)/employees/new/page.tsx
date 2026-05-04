import { EmployeeCreateView } from "@/features/employees";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "New employee",
  path: "/employees/new",
  noIndex: true,
});

export default function NewEmployeePage() {
  return <EmployeeCreateView />;
}
