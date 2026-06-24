"use client";

import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronsLeft,
  Clock,
  DoorOpen,
  FolderKanban,
  Home,
  Inbox,
  ListChecks,
  Network,
  Plug,
  Settings,
  Shield,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsAdmin, useIsAppAdmin } from "@/features/auth";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  exact?: boolean;
  adminOnly?: boolean;
  hrmAdminOnly?: boolean;
}

interface AppDef {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  matchPrefixes: string[];
  adminOnly?: boolean;
  nav: NavItem[];
}

const APPS: AppDef[] = [
  {
    id: "hr",
    label: "Nhân sự",
    icon: Users,
    href: "/hr",
    matchPrefixes: ["/hr", "/employees", "/departments", "/orgchart"],
    nav: [
      { href: "/employees", label: "Nhân sự", icon: Users },
      { href: "/departments", label: "Phòng ban", icon: Building2 },
      { href: "/orgchart", label: "Cây tổ chức", icon: Network },
    ],
  },
  {
    id: "attendance",
    label: "Chấm công",
    icon: Clock,
    href: "/attendance",
    matchPrefixes: ["/attendance", "/timesheet"],
    nav: [
      { href: "/timesheet", label: "Bảng chấm công", icon: CalendarDays, exact: true },
      { href: "/timesheet/reports", label: "Báo cáo", icon: BarChart3, adminOnly: true },
    ],
  },
  {
    id: "requests",
    label: "Đơn từ",
    icon: Inbox,
    href: "/requests",
    matchPrefixes: ["/requests"],
    nav: [
      { href: "/requests", label: "Đơn từ", icon: Inbox },
    ],
  },
  {
    id: "calendar",
    label: "Lịch",
    icon: CalendarDays,
    href: "/calendar",
    matchPrefixes: ["/calendar", "/bookings", "/rooms", "/resources"],
    nav: [
      { href: "/bookings", label: "Lịch", icon: CalendarDays },
      { href: "/rooms", label: "Phòng họp", icon: Building2 },
      { href: "/resources", label: "Tài nguyên", icon: DoorOpen, hrmAdminOnly: true },
    ],
  },
  {
    id: "work",
    label: "Công việc",
    icon: FolderKanban,
    href: "/work",
    matchPrefixes: ["/work", "/my-tasks", "/projects"],
    nav: [
      { href: "/my-tasks", label: "Việc của tôi", icon: ListChecks, exact: true },
      { href: "/projects", label: "Dự án", icon: FolderKanban },
      { href: "/projects/reports", label: "Báo cáo", icon: BarChart3, adminOnly: true },
    ],
  },
  {
    id: "recruitment",
    label: "Tuyển dụng",
    icon: Briefcase,
    href: "/recruitment",
    matchPrefixes: ["/recruitment"],
    adminOnly: true,
    nav: [
      { href: "/recruitment/jobs", label: "Jobs", icon: Briefcase },
      { href: "/recruitment/candidates", label: "Ứng viên", icon: UserPlus },
      { href: "/recruitment/integrations", label: "Kết nối job board", icon: Plug },
    ],
  },
];

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

  const activeApp =
    visibleApps.find((app) =>
      app.matchPrefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      ),
    ) ?? null;

  const activeNav = activeApp
    ? activeApp.nav.filter(
        (item) =>
          (!item.adminOnly || showAdmin) && (!item.hrmAdminOnly || isHrmAdmin),
      )
    : [];

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "flex shrink-0 flex-col bg-transparent transition-[width] duration-200",
        collapsed ? "w-12" : "w-56",
      )}
    >
      {activeApp ? (
        // ── APP NAV MODE ───────────────────────────────────────────────────────
        <>
          {!collapsed && (
            <div className="px-2 pt-2 pb-0.5">
              <Link
                href="/home"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
              >
                <ChevronLeft className="h-3 w-3" />
                Ứng dụng
              </Link>
              <p className="mt-0.5 px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                {activeApp.label}
              </p>
            </div>
          )}

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-1.5 py-1 scrollbar-thin">
            {activeNav.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                active={
                  !item.disabled &&
                  (pathname === item.href ||
                    (!item.exact && pathname.startsWith(`${item.href}/`)))
                }
              />
            ))}
          </nav>
        </>
      ) : (
        // ── APP LIST MODE ──────────────────────────────────────────────────────
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-1.5 py-2 scrollbar-thin">
          <NavLink
            item={{ href: "/home", label: "Trang chủ", icon: Home }}
            collapsed={collapsed}
            active={pathname === "/home"}
          />

          {collapsed ? (
            <div className="mx-2 my-2 border-t border-border/50" />
          ) : (
            <div className="px-2 pt-3 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              Ứng dụng
            </div>
          )}

          {visibleApps.map((app) => (
            <NavLink
              key={app.id}
              item={{ href: app.href, label: app.label, icon: app.icon }}
              collapsed={collapsed}
              active={false}
            />
          ))}
        </nav>
      )}

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
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

// ── NavLink ────────────────────────────────────────────────────────────────────

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
