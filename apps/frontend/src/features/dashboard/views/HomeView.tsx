"use client";

import {
  ArrowRight,
  Building2,
  Calendar,
  Inbox,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuth } from "@/features/auth";

interface QuickAction {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: "/settings/profile",
    icon: Settings,
    label: "Hoàn thiện hồ sơ",
    description: "Thêm tên, ảnh đại diện và số điện thoại để đồng nghiệp dễ nhận ra bạn.",
  },
  {
    href: "/settings/security",
    icon: Sparkles,
    label: "Đặt mật khẩu mạnh",
    description: "Đổi mật khẩu định kỳ và xem lại các phiên đăng nhập đang hoạt động.",
  },
];

const SHORTCUTS: QuickAction[] = [
  {
    href: "/employees",
    icon: Users,
    label: "Nhân viên",
    description: "Tra cứu, thêm và sửa hồ sơ nhân viên trong Org.",
  },
  {
    href: "/departments",
    icon: Building2,
    label: "Phòng ban",
    description: "Dựng cây phòng ban, chỉ định manager phụ trách.",
  },
  {
    href: "/timesheet",
    icon: Calendar,
    label: "Bảng giờ làm",
    description: "Xem chấm công của Org theo tháng — tổng hợp từ máy chấm công.",
  },
  {
    href: "/requests",
    icon: Inbox,
    label: "Đơn từ",
    description: "Tạo đơn xin nghỉ, đơn quên chấm; duyệt đơn của team bạn.",
  },
];

export function HomeView() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? null;

  return (
    <PageContainer>
      <div className="animate-fade-up rounded-2xl border border-border bg-linear-to-br from-primary/5 via-background to-background p-8">
        <Badge variant="secondary" className="mb-4">
          Chào mừng
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Chào{firstName ? `, ${firstName}` : " bạn"}.
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Đây là trang chủ C-HR của bạn. Dùng các phím tắt bên dưới để vào nhanh
          các module đang dùng nhiều nhất.
        </p>
      </div>

      <div
        className="animate-fade-up grid gap-4 md:grid-cols-3"
        style={{ animationDelay: "100ms" }}
      >
        <StatCard
          label="Hôm nay"
          value="—"
          hint="Số nhân viên đã chấm công đầu giờ"
        />
        <StatCard
          label="Tuần này"
          value="—"
          hint="Đơn từ đang chờ bạn duyệt"
        />
        <StatCard
          label="Tháng này"
          value="—"
          hint="Tổng số chấm công đã ghi nhận"
        />
      </div>

      <div
        className="animate-fade-up space-y-4"
        style={{ animationDelay: "200ms" }}
      >
        <h2 className="text-lg font-semibold tracking-tight">
          Hoàn thiện thiết lập
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {QUICK_ACTIONS.map((action) => (
            <ActionCard key={action.href} {...action} />
          ))}
        </div>
      </div>

      <div
        className="animate-fade-up space-y-4"
        style={{ animationDelay: "300ms" }}
      >
        <h2 className="text-lg font-semibold tracking-tight">Vào nhanh</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {SHORTCUTS.map((s) => (
            <ActionCard key={s.href} {...s} />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>
    </Card>
  );
}

function ActionCard({ href, icon: Icon, label, description }: QuickAction) {
  return (
    <Link href={href} className="block">
      <Card className="group h-full transition-colors hover:border-primary/40">
        <CardHeader>
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <CardTitle className="flex items-center justify-between text-base">
            {label}
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
          </CardTitle>
          <CardDescription className="leading-relaxed">
            {description}
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
