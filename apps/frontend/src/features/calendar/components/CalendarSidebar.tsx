"use client";

import { vi } from "date-fns/locale";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Unplug,
} from "lucide-react";
import { useState } from "react";
import type { View } from "react-big-calendar";

import { GoogleIcon, MicrosoftIcon } from "@/components/icons";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth";
import { cn } from "@/lib/utils";

import { useActiveWeekRange } from "../hooks/useActiveWeekRange";

interface CalendarSidebarProps {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  /** Current main-view mode — drives "highlight active week" in the mini-cal. */
  mainView: View;
  /** UserIds whose calendars are toggled on. */
  visibleUserIds: string[];
  onToggleUser: (userId: string, on: boolean) => void;
}

interface SectionProps {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  rightSlot?: React.ReactNode;
}

function Section({ label, children, defaultOpen = true, rightSlot }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-accent/40"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{label}</span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {rightSlot}
          {open ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

function ColorDot({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block h-2.5 w-2.5 rounded-sm border", className)}
    />
  );
}

export function CalendarSidebar({
  selectedDate,
  onSelectDate,
  mainView,
  visibleUserIds,
  onToggleUser,
}: CalendarSidebarProps) {
  const { user } = useAuth();
  const meId = user?.id;
  const meName = user?.name ?? user?.email ?? "Tôi";

  const weekRange = useActiveWeekRange(mainView, selectedDate);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-background">
      {/* Mini calendar */}
      <div className="px-2 pt-3">
        <Calendar
          mode="single"
          locale={vi}
          showOutsideDays
          weekStartsOn={1}
          selected={selectedDate}
          onSelect={(d) => d && onSelectDate(d)}
          className="w-full"
          modifiers={weekRange ? { activeWeek: weekRange } : undefined}
          modifiersClassNames={{ activeWeek: "rdp-active-week" }}
        />
      </div>

      {/* Search people */}
      <div className="border-y px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm người"
              className="h-8 pl-8 text-xs"
              disabled
              title="Sắp ra mắt"
            />
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-accent disabled:opacity-50"
            disabled
            aria-label="Thêm theo dõi"
            title="Sắp ra mắt"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto">
        <Section label="Quản lý">
          {meId ? (
            <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
              <Checkbox
                checked={visibleUserIds.includes(meId)}
                onCheckedChange={(v) => onToggleUser(meId, v === true)}
              />
              <ColorDot className="border-primary/40 bg-primary/15" />
              <span className="truncate">{meName}</span>
            </label>
          ) : (
            <p className="text-xs text-muted-foreground">Chưa đăng nhập</p>
          )}
        </Section>

        <Section label="Theo dõi" defaultOpen={false}>
          <p className="text-xs text-muted-foreground">
            Chưa theo dõi ai. Tính năng theo dõi đồng nghiệp đang được xây dựng.
          </p>
        </Section>

        <Section
          label="Lịch từ Google"
          defaultOpen={false}
          rightSlot={<Unplug className="h-3.5 w-3.5" />}
        >
          <button
            type="button"
            disabled
            title="Sắp ra mắt"
            className="flex w-full items-center gap-2 rounded-md border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent disabled:opacity-60"
          >
            <GoogleIcon className="h-3.5 w-3.5" />
            Kết nối Google Calendar
          </button>
        </Section>

        <Section
          label="Lịch từ Microsoft"
          defaultOpen={false}
          rightSlot={<Unplug className="h-3.5 w-3.5" />}
        >
          <button
            type="button"
            disabled
            title="Sắp ra mắt"
            className="flex w-full items-center gap-2 rounded-md border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent disabled:opacity-60"
          >
            <MicrosoftIcon className="h-3.5 w-3.5" />
            Kết nối Microsoft Outlook
          </button>
        </Section>
      </div>
    </aside>
  );
}
