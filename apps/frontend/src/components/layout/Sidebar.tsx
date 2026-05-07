"use client";

import {
  Building2,
  CalendarClock,
  Calendar,
  DoorOpen,
  Home,
  Inbox,
  Network,
  Settings,
  Shield,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsAdmin, useIsAppAdmin } from "@/features/auth";
import { SITE } from "@/lib/seo";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Render as non-clickable placeholder until the feature lands. */
  disabled?: boolean;
}

interface NavSection {
  /** Optional section heading; omit for the top group. */
  label?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ href: "/home", label: "Trang chủ", icon: Home }],
  },
  {
    label: "Nhân sự",
    items: [
      { href: "/employees", label: "Nhân sự", icon: Users },
      { href: "/departments", label: "Phòng ban", icon: Building2 },
      { href: "/orgchart", label: "Cây tổ chức", icon: Network },
    ],
  },
  {
    label: "Chấm công",
    items: [{ href: "/timesheet", label: "Bảng giờ làm", icon: Calendar }],
  },
  {
    label: "Đơn từ",
    items: [{ href: "/requests", label: "Đơn từ", icon: Inbox }],
  },
  {
    label: "Lịch",
    items: [
      { href: "/bookings", label: "Lịch", icon: CalendarClock },
      { href: "/rooms", label: "Phòng họp", icon: Building2 },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  const isHrmAdmin = useIsAppAdmin("HRM");
  const showAdmin = isAdmin || isHrmAdmin;

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

      <nav className="flex-1 space-y-3 overflow-y-auto p-2 scrollbar-thin">
        {NAV_SECTIONS.map((section, idx) => (
          <div key={section.label ?? idx} className="space-y-1">
            {section.label &&
              (collapsed ? (
                <div className="mx-2 my-2 border-t border-border/60" />
              ) : (
                <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {section.label}
                </div>
              ))}
            {section.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                active={
                  !item.disabled &&
                  (pathname === item.href ||
                    pathname.startsWith(`${item.href}/`))
                }
              />
            ))}
            {section.label === "Lịch" && isHrmAdmin && (
              <NavLink
                item={{
                  href: "/resources",
                  label: "Tài nguyên",
                  icon: DoorOpen,
                }}
                collapsed={collapsed}
                active={
                  pathname === "/resources" ||
                  pathname.startsWith("/resources/")
                }
              />
            )}
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-1 border-t p-2">
        {showAdmin && (
          <NavLink
            item={{ href: "/admin", label: "Quản trị", icon: Shield }}
            collapsed={collapsed}
            active={pathname === "/admin" || pathname.startsWith("/admin/")}
          />
        )}
        <NavLink
          item={{ href: "/settings", label: "Cài đặt", icon: Settings }}
          collapsed={collapsed}
          active={pathname === "/settings" || pathname.startsWith("/settings/")}
        />
      </div>
    </aside>
  );
}

function NavLink({
  item,
  collapsed,
  active,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
}) {
  const baseClasses = cn(
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
    item.disabled
      ? "cursor-not-allowed text-muted-foreground/50"
      : active
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
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

  if (!collapsed && !item.disabled) return node;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{node}</TooltipTrigger>
      <TooltipContent side="right">
        {item.disabled ? `${item.label} — sắp có` : item.label}
      </TooltipContent>
    </Tooltip>
  );
}
