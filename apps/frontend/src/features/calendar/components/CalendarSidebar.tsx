"use client";

import { vi } from "date-fns/locale";
import { ChevronDown, ChevronRight, Trash2, Unplug } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { View } from "react-big-calendar";

import { GoogleIcon, MicrosoftIcon } from "@/components/icons";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/features/auth";
import { EmployeePicker } from "@/features/employees";
import { cn } from "@/lib/utils";

import { useActiveWeekRange } from "../hooks/useActiveWeekRange";
import {
  useCalendarFollows,
  useCreateCalendarFollow,
  useDeleteCalendarFollow,
} from "../hooks/useCalendarFollows";
import { userColorFromId } from "../lib/user-color";

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

  const followsQuery = useCalendarFollows();
  const createFollow = useCreateCalendarFollow();
  const deleteFollow = useDeleteCalendarFollow();
  const follows = followsQuery.data ?? [];

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
          className="w-full p-1"
          modifiers={weekRange ? { activeWeek: weekRange } : undefined}
          modifiersClassNames={{ activeWeek: "rdp-active-week" }}
        />
      </div>

      {/* Add follow */}
      <div className="border-y px-3 py-2">
        <EmployeePicker
          value={null}
          onChange={(id) => {
            if (!id) return;
            createFollow.mutate(
              { followedId: id },
              {
                onSuccess: () => toast.success("Đã theo dõi"),
                onError: (err) =>
                  toast.error(
                    (err as { response?: { data?: { error?: { message?: string } } } })
                      ?.response?.data?.error?.message ?? "Không theo dõi được",
                  ),
              },
            );
          }}
          placeholder="Thêm người để theo dõi…"
        />
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

        <Section label={`Theo dõi (${follows.length})`} defaultOpen>
          {follows.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Chưa theo dõi ai.
            </p>
          ) : (
            <div className="space-y-1">
              {follows.map((f) => {
                const userId = f.followed?.user?.id;
                const name =
                  f.followed?.user?.name ??
                  f.followed?.user?.email ??
                  f.followed?.code ??
                  "(không tên)";
                return (
                  <div
                    key={f.id}
                    className="group flex items-center gap-2.5 py-1 text-sm"
                  >
                    <Checkbox
                      checked={!!userId && visibleUserIds.includes(userId)}
                      disabled={!userId}
                      onCheckedChange={(v) =>
                        userId && onToggleUser(userId, v === true)
                      }
                    />
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-2.5 rounded-sm border"
                      style={{
                        backgroundColor: userId
                          ? `${userColorFromId(userId)}40`
                          : undefined,
                        borderColor: userId
                          ? userColorFromId(userId)
                          : undefined,
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate">{name}</span>
                    <button
                      type="button"
                      className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      aria-label="Bỏ theo dõi"
                      onClick={() =>
                        deleteFollow.mutate(f.id, {
                          onSuccess: () => toast.success("Đã bỏ theo dõi"),
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
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
