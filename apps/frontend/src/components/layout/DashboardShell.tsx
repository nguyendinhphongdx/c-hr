"use client";

import { useState, type ReactNode } from "react";

import { AuthGuard } from "@/components/layout/AuthGuard";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { RunningTimerBar } from "@/features/work/components/timer/RunningTimerBar";

/**
 * Client wrapper that owns dashboard chrome state (sidebar collapse).
 * The route layout itself stays an RSC; only this shell is "use client".
 * Hosts the cross-page running-timer indicator so it survives navigation.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AuthGuard>
      <div className="flex h-[100dvh] flex-col bg-muted/70">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            collapsed={collapsed}
            onToggle={() => setCollapsed((c) => !c)}
          />
          <div className="flex flex-1 overflow-hidden pr-3 pb-3">
            <main className="flex-1 overflow-auto rounded-xl border bg-card scrollbar-thin">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
          </div>
        </div>
      </div>
      <RunningTimerBar />
    </AuthGuard>
  );
}
