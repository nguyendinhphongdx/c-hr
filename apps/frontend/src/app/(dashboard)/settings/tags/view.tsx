"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useIsAppAdmin } from "@/features/auth";
import { TagLibraryAdmin } from "@/features/tags";

export function TagsSettingsView() {
  const isHrmAdmin = useIsAppAdmin("HRM");

  if (!isHrmAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
          <CardDescription>
            Chỉ HRM admin mới truy cập được thư viện tag.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Liên hệ Org admin nếu bạn cần quyền chỉnh sửa.
        </CardContent>
      </Card>
    );
  }

  return <TagLibraryAdmin />;
}
