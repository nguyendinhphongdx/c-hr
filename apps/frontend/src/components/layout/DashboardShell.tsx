"use client";

import { useState, type ReactNode } from "react";

import { AuthGuard } from "@/components/layout/AuthGuard";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

/**
 * Client wrapper that owns dashboard chrome state (sidebar collapse).
 * The route layout itself stays an RSC; only this shell is "use client".
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AuthGuard>
      <div className="flex h-[100dvh]">
        <Sidebar collapsed={collapsed} />
        <div className="flex flex-1 flex-col">
          <Header
            sidebarCollapsed={collapsed}
            onToggleSidebar={() => setCollapsed((c) => !c)}
          />
          <main className="flex-1 overflow-auto scrollbar-thin">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
