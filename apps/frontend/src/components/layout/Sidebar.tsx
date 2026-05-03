"use client";

import {
  Home,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SITE } from "@/lib/seo";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "flex shrink-0 flex-col border-r bg-muted/30 transition-[width] duration-200",
        collapsed ? "w-14" : "w-60",
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight">
            {SITE.name}
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const link = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );

          if (!collapsed) return link;
          return (
            <Tooltip key={item.href} delayDuration={0}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </aside>
  );
}
