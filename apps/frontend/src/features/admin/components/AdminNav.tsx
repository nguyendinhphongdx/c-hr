"use client";

import {
  Building2,
  CalendarClock,
  Radio,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useIsAdmin, useIsAppAdmin } from "@/features/auth";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Building2;
  /** When true, only render if useIsAdmin() returns true. */
  adminOnly?: boolean;
  /** When true, only render if useIsAppAdmin("HRM") returns true. */
  hrmOnly?: boolean;
}

const ITEMS: NavItem[] = [
  { href: "/admin/organization", label: "Doanh nghiệp", icon: Building2, adminOnly: true },
  { href: "/admin/app-admins", label: "Quản trị app", icon: Shield, adminOnly: true },
  { href: "/admin/work-schedule", label: "Ca làm chuẩn", icon: CalendarClock, hrmOnly: true },
  { href: "/admin/attendance-devices", label: "Máy chấm công", icon: Radio, hrmOnly: true },
];

export function AdminNav() {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  const isHrmAdmin = useIsAppAdmin("HRM");
  const items = ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.hrmOnly && !isHrmAdmin) return false;
    return true;
  });

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
