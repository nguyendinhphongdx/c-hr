import type { ReactNode } from "react";

import { AdminNav } from "@/features/admin";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Administration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Org-level configuration. Visible only to admin Org and HRM appadmins.
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-[200px_1fr]">
        <aside>
          <AdminNav />
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}
