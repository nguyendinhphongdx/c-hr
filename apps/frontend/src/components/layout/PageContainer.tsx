import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const VARIANT_CLASSES = {
  default: "mx-auto w-full max-w-6xl space-y-6 px-6 py-8",
  narrow: "mx-auto w-full max-w-2xl space-y-6 px-6 py-8",
  wide: "mx-auto w-full max-w-7xl space-y-6 px-6 py-8",
  bleed: "px-6 py-6",
} as const;

export type PageContainerVariant = keyof typeof VARIANT_CLASSES;

interface PageContainerProps {
  children: ReactNode;
  variant?: PageContainerVariant;
  className?: string;
}

/**
 * Single source of truth for dashboard page padding/width. Use the variant
 * that matches the page kind:
 *   - default  → list/chart/detail pages (max-w-6xl)
 *   - narrow   → forms (max-w-2xl)
 *   - wide     → dense dashboards needing more horizontal room (max-w-7xl)
 *   - bleed    → full-bleed layouts (e.g. 3-pane), keeps only outer padding
 */
export function PageContainer({
  children,
  variant = "default",
  className,
}: PageContainerProps) {
  return (
    <div className={cn(VARIANT_CLASSES[variant], className)}>{children}</div>
  );
}
