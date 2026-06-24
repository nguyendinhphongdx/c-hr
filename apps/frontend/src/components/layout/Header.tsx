"use client";

import { Check, ChevronDown, LogOut, Search, Settings, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { APPS, getActiveApp } from "@/components/layout/apps";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAuth, useIsAdmin, useIsAppAdmin, useLogout } from "@/features/auth";

function AppSwitcher() {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  const isHrmAdmin = useIsAppAdmin("HRM");
  const showAdmin = isAdmin || isHrmAdmin;

  const visibleApps = APPS.filter((app) => !app.adminOnly || showAdmin);
  const activeApp = getActiveApp(pathname, visibleApps);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 gap-1.5 px-2 text-sm font-medium">
          {activeApp ? (
            <>
              <activeApp.icon className="h-4 w-4 text-muted-foreground" />
              <span>{activeApp.label}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Ứng dụng</span>
          )}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Ứng dụng
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {visibleApps.map((app) => (
          <DropdownMenuItem key={app.id} asChild>
            <Link href={app.href} className="flex items-center gap-2">
              <app.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{app.label}</span>
              {activeApp?.id === app.id && (
                <Check className="h-3.5 w-3.5 text-primary" />
              )}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getInitials(value: string | null | undefined): string {
  if (!value) return "U";
  const parts = value.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return value.slice(0, 2).toUpperCase();
}

export function Header() {
  const { user } = useAuth();
  const logout = useLogout();

  const initials = getInitials(user?.name ?? user?.email ?? null);

  return (
    <header className="relative flex h-12 shrink-0 items-center gap-3 px-3">
      <div className="flex shrink-0 items-center gap-2">
        <Link href="/home">
          <Image src="/images/logo/logo-icon.ai.svg" alt="C-HR" width={61} height={32} className="h-8 w-auto" />
        </Link>
        <div className="h-4 w-px bg-border/70" />
        <AppSwitcher />
      </div>

      <div className="absolute left-1/2 w-full max-w-sm -translate-x-1/2">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          className="h-8 pl-8 pr-12 text-sm focus-visible:ring-0 bg-card"
          placeholder="Tìm kiếm..."
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 select-none rounded border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="space-y-0.5">
              <p className="text-sm font-medium leading-none">
                {user?.name ?? "Khách"}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/profile">
                <User className="mr-2 h-4 w-4" />
                Hồ sơ
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Cài đặt
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => logout.mutate()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
