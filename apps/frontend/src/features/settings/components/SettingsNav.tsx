"use client";

import { KeyRound, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useIsAdmin } from "@/features/auth";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof User;
  adminOnly?: boolean;
}

const ITEMS: NavItem[] = [
  { href: "/settings/profile", label: "Hồ sơ", icon: User },
  { href: "/settings/security", label: "Bảo mật", icon: KeyRound },
  { href: "/settings/sso", label: "SSO Microsoft", icon: ShieldCheck, adminOnly: true },
];

export function SettingsNav() {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();

  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.filter((it) => !it.adminOnly || isAdmin).map((item) => {
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
