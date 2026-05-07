"use client";

import {
  ArrowRight,
  Building2,
  Calendar,
  Inbox,
  Network,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Shortcut {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
}

const SHORTCUTS: Shortcut[] = [
  {
    href: "/employees",
    icon: Users,
    label: "Nhân sự",
    description: "Tra cứu, thêm và sửa hồ sơ nhân sự trong Org.",
  },
  {
    href: "/departments",
    icon: Building2,
    label: "Phòng ban",
    description: "Dựng cây phòng ban, chỉ định manager phụ trách.",
  },
  {
    href: "/orgchart",
    icon: Network,
    label: "Sơ đồ tổ chức",
    description: "Cấp báo cáo, cây phòng ban và sơ đồ trực quan.",
  },
  {
    href: "/timesheet",
    icon: Calendar,
    label: "Bảng giờ làm",
    description: "Xem chấm công theo tháng — tổng hợp từ máy chấm công.",
  },
  {
    href: "/requests",
    icon: Inbox,
    label: "Đơn từ",
    description: "Tạo đơn xin nghỉ, đơn quên chấm; duyệt đơn của team.",
  },
];

export function Shortcuts() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold tracking-tight">Vào nhanh</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {SHORTCUTS.map((s) => (
          <Link key={s.href} href={s.href} className="block">
            <Card className="group h-full transition-colors hover:border-primary/40">
              <CardHeader className="pb-3">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-4 w-4" />
                </div>
                <CardTitle className="flex items-center justify-between text-sm">
                  {s.label}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {s.description}
                </CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
