"use client";

import { ChevronsLeft, Settings, Shield } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { type NavItem, APPS, getActiveApp } from "@/components/layout/apps";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsAdmin, useIsAppAdmin } from "@/features/auth";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  const isHrmAdmin = useIsAppAdmin("HRM");
  const showAdmin = isAdmin || isHrmAdmin;

  const visibleApps = APPS.filter((app) => !app.adminOnly || showAdmin);
  const activeApp = getActiveApp(pathname, visibleApps);
  const homeApp = visibleApps.find((app) => app.id === "home");
  const showAppDirectory = !activeApp || activeApp.id === "home";

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "flex shrink-0 flex-col bg-transparent transition-[width] duration-200",
        collapsed ? "w-12" : "w-56",
      )}
    >
      <nav className="flex-1 overflow-y-auto px-1.5 py-2 scrollbar-thin">
        {showAppDirectory && homeApp ? (
          <div className="space-y-0.5">
            <NavLink
              item={{
                href: homeApp.href,
                label: homeApp.label,
                icon: homeApp.icon,
              }}
              collapsed={collapsed}
              active={pathname === homeApp.href}
            />
            {collapsed ? (
              <div className="mx-2 my-2 border-t border-border/50" />
            ) : (
              <p className="px-2 pt-3 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                Ứng dụng
              </p>
            )}
            {visibleApps
              .filter((app) => app.id !== "home")
              .map((app) => (
                <NavLink
                  key={app.id}
                  item={{ href: app.href, label: app.label, icon: app.icon }}
                  collapsed={collapsed}
                  active={false}
                />
              ))}
          </div>
        ) : activeApp ? (
          <div className="space-y-3">
            {activeApp.nav.map((section, sIdx) => {
              const items = section.items.filter(
                (item) =>
                  (!item.adminOnly || showAdmin) &&
                  (!item.hrmAdminOnly || isHrmAdmin),
              );
              if (items.length === 0) return null;
              return (
                <div key={sIdx} className="space-y-0.5">
                  {section.label &&
                    (collapsed ? (
                      <div className="mx-2 border-t border-border/50" />
                    ) : (
                      <p className="px-2 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                        {section.label}
                      </p>
                    ))}
                  {items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      collapsed={collapsed}
                      active={
                        !item.disabled &&
                        (pathname === item.href ||
                          (!item.exact &&
                            pathname.startsWith(`${item.href}/`)))
                      }
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ) : null}
      </nav>

      <div className="mt-auto border-t border-border/50 px-1.5 py-2 space-y-0.5">
        {showAdmin && (
          <NavLink
            item={{ href: "/admin", label: "Quản trị", icon: Shield }}
            collapsed={collapsed}
            active={pathname === "/admin" || pathname.startsWith("/admin/")}
          />
        )}
        <div className={cn("flex items-center", collapsed ? "flex-col gap-0.5" : "gap-0.5")}>
          <div className={cn(collapsed ? "w-full" : "flex-1 min-w-0")}>
            <NavLink
              item={{ href: "/settings", label: "Cài đặt", icon: Settings }}
              collapsed={collapsed}
              active={
                pathname === "/settings" || pathname.startsWith("/settings/")
              }
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onToggle}
          >
            <ChevronsLeft
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                collapsed && "rotate-180",
              )}
            />
          </Button>
        </div>
      </div>
    </aside>
  );
}

function NavLink({
  item,
  collapsed,
  active,
}: {
  item: Pick<NavItem, "href" | "label" | "icon" | "disabled">;
  collapsed: boolean;
  active: boolean;
}) {
  const baseClasses = cn(
    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
    item.disabled
      ? "cursor-not-allowed text-muted-foreground/40"
      : active
        ? "bg-primary/15 text-primary font-medium"
        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
    collapsed && "justify-center px-0",
  );

  const inner = (
    <>
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </>
  );

  const node = item.disabled ? (
    <div aria-disabled="true" className={baseClasses}>
      {inner}
    </div>
  ) : (
    <Link href={item.href} className={baseClasses}>
      {inner}
    </Link>
  );

  if (!collapsed) return node;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{node}</TooltipTrigger>
      <TooltipContent side="right">
        {item.disabled ? `${item.label} — sắp có` : item.label}
      </TooltipContent>
    </Tooltip>
  );
}
