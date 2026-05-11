import { createMetadata } from "@/lib/seo";

import { PayrollSettingsView } from "./view";

export const metadata = createMetadata({
  title: "Cấu hình lương",
  path: "/settings/payroll",
  noIndex: true,
});

export default function PayrollSettingsPage() {
  return <PayrollSettingsView />;
}
