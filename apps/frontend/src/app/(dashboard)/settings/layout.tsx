import type { ReactNode } from "react";
import { SettingsNav } from "@/features/settings";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, preferences, and security.
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-[200px_1fr]">
        <aside>
          <SettingsNav />
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}
