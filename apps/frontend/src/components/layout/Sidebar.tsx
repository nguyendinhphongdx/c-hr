"use client";

import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarClock,
  Calendar,
  ClipboardCheck,
  ClipboardList,
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
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppLogo, AppLogoMark } from "@/components/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth, useIsAdmin, useIsAppAdmin } from "@/features/auth";
import { useMyOnboardingPlan } from "@/features/onboarding";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Render as non-clickable placeholder until the feature lands. */
  disabled?: boolean;
  /**
   * Match active state by exact equality only — skip the prefix check.
   * Use when a sibling route would otherwise trigger this item too.
   * E.g. `/timesheet/reports` shouldn't light `/timesheet`.
   */
  exact?: boolean;
  /** Hide from non-admin users (HRM appadmin or higher). */
  adminOnly?: boolean;
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
    label: "Thời gian làm việc",
    items: [
      { href: "/timesheet", label: "Bảng chấm công", icon: Calendar, exact: true },
    ],
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
  {
    label: "Công việc",
    items: [
      {
        href: "/my-tasks",
        label: "Việc của tôi",
        icon: ListChecks,
        exact: true,
      },
      { href: "/projects", label: "Dự án", icon: FolderKanban },
    ],
  },
  {
    label: "Tuyển dụng",
    items: [
      {
        href: "/recruitment/jobs",
        label: "Jobs",
        icon: Briefcase,
        adminOnly: true,
      },
      {
        href: "/recruitment/candidates",
        label: "Ứng viên",
        icon: UserPlus,
        adminOnly: true,
      },
      {
        href: "/recruitment/integrations",
        label: "Kết nối job board",
        icon: Plug,
        adminOnly: true,
      },
    ],
  },
  {
    label: "Lương",
    items: [{ href: "/payroll", label: "Bảng lương", icon: Wallet }],
  },
  {
    // Self-service item is rendered inline below (visibility depends on
    // whether the current user has an active plan); admin item lives in
    // the section's items list and is filtered out for non-admins.
    label: "Onboarding",
    items: [
      {
        href: "/onboarding",
        label: "Quản lý onboarding",
        icon: ClipboardList,
        adminOnly: true,
      },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isHrmAdmin = useIsAppAdmin("HRM");
  const showAdmin = isAdmin || isHrmAdmin;

  // Drives visibility of the non-admin "Việc onboard của tôi" link. The
  // hook short-circuits on missing employeeId so orphan users skip the
  // network round-trip entirely.
  const { hasActivePlan: showMyOnboarding } = useMyOnboardingPlan(
    user?.employeeId ?? null,
  );

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "flex shrink-0 flex-col border-r bg-muted/30 transition-[width] duration-200",
        collapsed ? "w-14" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        {collapsed ? <AppLogoMark size={28} /> : <AppLogo height={32} />}
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto p-2 scrollbar-thin">
        {NAV_SECTIONS.map((section, idx) => {
          if (section.label === "Lương" && !showAdmin) return null;
          // Filter section-defined items by adminOnly flag — keeps the
          // "Quản lý onboarding" link admin-gated without nesting a
          // separate section.
          const items = section.items.filter(
            (it) => !it.adminOnly || showAdmin,
          );
          // Onboarding section header should disappear when neither the
          // admin link nor the self-service link are visible.
          const isOnboardingSection = section.label === "Onboarding";
          if (
            isOnboardingSection &&
            items.length === 0 &&
            !showMyOnboarding
          ) {
            return null;
          }
          return (
          <div key={section.label ?? idx} className="space-y-1">
            {section.label &&
              (collapsed ? (
                <div className="mx-2 my-2 border-t border-border/60" />
              ) : (
                <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {section.label}
                </div>
              ))}
            {isOnboardingSection && showMyOnboarding && (
              <NavLink
                item={{
                  href: "/my-onboarding",
                  label: "Việc onboard của tôi",
                  icon: ClipboardCheck,
                }}
                collapsed={collapsed}
                active={
                  pathname === "/my-onboarding" ||
                  pathname.startsWith("/my-onboarding/")
                }
              />
            )}
            {items.map((item) => (
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
            {section.label === "Thời gian làm việc" && showAdmin && (
              <NavLink
                item={{
                  href: "/timesheet/reports",
                  label: "Báo cáo",
                  icon: BarChart3,
                }}
                collapsed={collapsed}
                active={
                  pathname === "/timesheet/reports" ||
                  pathname.startsWith("/timesheet/reports/")
                }
              />
            )}
            {section.label === "Công việc" && showAdmin && (
              <NavLink
                item={{
                  href: "/projects/reports",
                  label: "Báo cáo",
                  icon: BarChart3,
                }}
                collapsed={collapsed}
                active={
                  pathname === "/projects/reports" ||
                  pathname.startsWith("/projects/reports/")
                }
              />
            )}
          </div>
          );
        })}
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
