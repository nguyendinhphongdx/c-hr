"use client";

import { Loader2, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useIsAppAdmin } from "@/features/auth";
import {
  TemplateCard,
  TemplateCreateDialog,
  TemplateEditDialog,
  useTemplates,
  type OnboardingTemplate,
} from "@/features/onboarding";
import type { ID } from "@/lib/types";

export function OnboardingSettingsView() {
  const isHrmAdmin = useIsAppAdmin("HRM");

  if (!isHrmAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mẫu onboarding</CardTitle>
          <CardDescription>
            Chỉ HRM admin mới quản lý được mẫu onboarding.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Liên hệ Org admin nếu bạn cần quyền chỉnh sửa.
        </CardContent>
      </Card>
    );
  }

  return <OnboardingSettingsAdminView />;
}

function OnboardingSettingsAdminView() {
  const list = useTemplates();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<ID | null>(null);

  const openEdit = (template: OnboardingTemplate) => {
    setEditTemplateId(template.id);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Mẫu onboarding
          </h2>
          <p className="text-sm text-muted-foreground">
            Tạo bộ công việc khuôn mẫu để áp tự động cho nhân viên mới.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Tạo mẫu
        </Button>
      </header>

      {list.isLoading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
        </div>
      ) : list.error ? (
        <p className="py-8 text-sm text-destructive">
          Lỗi: {(list.error as Error).message ?? "không tải được mẫu"}
        </p>
      ) : !list.data || list.data.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Chưa có mẫu onboarding nào. Tạo mẫu để tự động giao việc khi nhân
            viên mới onboard.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {list.data.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={openEdit}
            />
          ))}
        </div>
      )}

      <TemplateCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(t) => setEditTemplateId(t.id)}
      />
      <TemplateEditDialog
        open={!!editTemplateId}
        templateId={editTemplateId}
        onClose={() => setEditTemplateId(null)}
      />
    </div>
  );
}
