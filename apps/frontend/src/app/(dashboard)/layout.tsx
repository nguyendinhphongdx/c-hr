import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";

/**
 * RSC layout — keeps Server Component benefits (streaming, cookies access at
 * the layout level if needed). Sidebar collapse state lives in DashboardShell.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
