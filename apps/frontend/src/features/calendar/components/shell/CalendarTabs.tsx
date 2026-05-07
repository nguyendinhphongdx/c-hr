"use client";

import { Building2, CalendarDays } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/bookings", label: "Lịch", icon: CalendarDays },
  { href: "/rooms", label: "Phòng họp", icon: Building2 },
] as const;

/**
 * Top-of-page tab bar shared by `/bookings` and `/rooms`. Looks like the
 * shadcn Tabs primitive but each tab is a `<Link>` so the pages stay
 * separately routed (different layouts, different URL state).
 */
export function CalendarTabs() {
  const pathname = usePathname();

  return (
    <div className="inline-flex h-8 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground">
      {TABS.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative inline-flex h-[calc(100%-1px)] items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-0.5 text-xs font-medium whitespace-nowrap transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              active
                ? "bg-background text-foreground shadow-sm dark:border-input dark:bg-input/30"
                : "text-foreground/60 dark:text-muted-foreground",
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
