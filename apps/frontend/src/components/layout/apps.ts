import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  Clock,
  DoorOpen,
  FolderKanban,
  Home,
  Inbox,
  ListChecks,
  Network,
  Plug,
  ReceiptText,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  exact?: boolean;
  adminOnly?: boolean;
  hrmAdminOnly?: boolean;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export interface AppDef {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  matchPrefixes: string[];
  adminOnly?: boolean;
  nav: NavSection[];
}

export const APPS: AppDef[] = [
  {
    id: "home",
    label: "Trang chủ",
    icon: Home,
    href: "/home",
    matchPrefixes: ["/home"],
    nav: [],
  },
  {
    id: "hrm",
    label: "Nhân sự",
    icon: Users,
    href: "/hrm",
    matchPrefixes: ["/hrm"],
    nav: [
      {
        items: [
          { href: "/hrm/employees", label: "Nhân sự", icon: Users },
          { href: "/hrm/departments", label: "Phòng ban", icon: Building2 },
          { href: "/hrm/orgchart", label: "Cây tổ chức", icon: Network },
        ],
      },
      {
        label: "Tuyển dụng",
        items: [
          {
            href: "/hrm/recruitment/jobs",
            label: "Jobs",
            icon: Briefcase,
            adminOnly: true,
          },
          {
            href: "/hrm/recruitment/candidates",
            label: "Ứng viên",
            icon: UserPlus,
            adminOnly: true,
          },
          {
            href: "/hrm/recruitment/integrations",
            label: "Kết nối job board",
            icon: Plug,
            adminOnly: true,
          },
        ],
      },
      {
        label: "Lương",
        items: [
          {
            href: "/hrm/payroll",
            label: "Bảng lương",
            icon: ReceiptText,
            hrmAdminOnly: true,
          },
        ],
      },
    ],
  },
  {
    id: "attendance",
    label: "Chấm công",
    icon: Clock,
    href: "/attendance",
    matchPrefixes: ["/attendance"],
    nav: [
      {
        items: [
          {
            href: "/attendance/timesheet",
            label: "Bảng chấm công",
            icon: CalendarDays,
            exact: true,
          },
          {
            href: "/attendance/timesheet/reports",
            label: "Báo cáo",
            icon: BarChart3,
            adminOnly: true,
          },
        ],
      },
    ],
  },
  {
    id: "approval",
    label: "Đơn từ",
    icon: Inbox,
    href: "/approval",
    matchPrefixes: ["/approval"],
    nav: [
      {
        items: [{ href: "/approval/requests", label: "Đơn từ", icon: Inbox }],
      },
    ],
  },
  {
    id: "calendar",
    label: "Lịch",
    icon: CalendarDays,
    href: "/calendar",
    matchPrefixes: ["/calendar"],
    nav: [
      {
        items: [
          {
            href: "/calendar/bookings",
            label: "Lịch",
            icon: CalendarDays,
          },
          {
            href: "/calendar/rooms",
            label: "Phòng họp",
            icon: Building2,
          },
          {
            href: "/calendar/resources",
            label: "Tài nguyên",
            icon: DoorOpen,
            hrmAdminOnly: true,
          },
        ],
      },
    ],
  },
  {
    id: "work",
    label: "Công việc",
    icon: FolderKanban,
    href: "/work",
    matchPrefixes: ["/work"],
    nav: [
      {
        items: [
          {
            href: "/work/my-tasks",
            label: "Việc của tôi",
            icon: ListChecks,
            exact: true,
          },
          {
            href: "/work/projects",
            label: "Dự án",
            icon: FolderKanban,
            exact: true,
          },
          {
            href: "/work/projects/reports",
            label: "Báo cáo",
            icon: BarChart3,
            adminOnly: true,
          },
        ],
      },
    ],
  },
];

export function getActiveApp(
  pathname: string,
  apps: AppDef[],
): AppDef | null {
  return (
    apps.find((app) =>
      app.matchPrefixes.some(
        (prefix) =>
          pathname === prefix || pathname.startsWith(`${prefix}/`),
      ),
    ) ?? null
  );
}
