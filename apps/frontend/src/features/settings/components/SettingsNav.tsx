"use client";

import { Building2, KeyRound, Shield, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useIsAdmin } from "@/features/auth";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof User;
  /** When true, only render if useIsAdmin() returns true. */
  adminOnly?: boolean;
}

const ITEMS: NavItem[] = [
  { href: "/settings/profile", label: "Profile", icon: User },
  { href: "/settings/security", label: "Security", icon: KeyRound },
  { href: "/settings/organization", label: "Organization", icon: Building2, adminOnly: true },
  { href: "/settings/app-admins", label: "App admins", icon: Shield, adminOnly: true },
];

export function SettingsNav() {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  const items = ITEMS.filter((item) => !item.adminOnly || isAdmin);

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
