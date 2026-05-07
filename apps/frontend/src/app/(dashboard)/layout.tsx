import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";

/**
 * RSC layout — keeps Server Component benefits (streaming, cookies access at
 * the layout level if needed). Sidebar collapse state lives in DashboardShell.
 *
 * `force-dynamic` opts every dashboard page into per-request render. Without
 * it, Next.js prod build statically pre-renders pages, and
 * `useSearchParams()` inside client components only reads the build-time
 * snapshot — clicking pickers / month nav updates the URL via
 * `router.replace()` but the hook doesn't re-read, so the UI looks frozen
 * (no API calls, no logs). All dashboard pages are auth-gated +
 * user-specific anyway, static caching has no benefit.
 */
export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
