import type { ReactNode } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { SettingsNav } from "@/features/settings";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <PageContainer>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your personal profile and security. Org-level configuration lives
          under <span className="font-medium">Admin</span>.
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-[200px_1fr]">
        <aside>
          <SettingsNav />
        </aside>
        <div>{children}</div>
      </div>
    </PageContainer>
  );
}
