"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useIsAppAdmin } from "@/features/auth";
import { PayrollConfigForm } from "@/features/payroll";

export function PayrollSettingsView() {
  const isHrmAdmin = useIsAppAdmin("HRM");

  if (!isHrmAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cấu hình lương</CardTitle>
          <CardDescription>
            Chỉ HRM admin mới truy cập được cấu hình lương.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Liên hệ Org admin nếu bạn cần quyền chỉnh sửa.
        </CardContent>
      </Card>
    );
  }

  return <PayrollConfigForm />;
}
