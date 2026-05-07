"use client";

import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Plus,
  Settings,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ToolbarProps, View } from "react-big-calendar";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import type { ID } from "@/lib/types";

import { DateRangePickerPopover } from "./DateRangePickerPopover";
import {
  RoomModeSwitcher,
  type CalendarMode,
} from "./RoomModeSwitcher";

const VIEW_LABELS: Partial<Record<View, string>> = {
  day: "Ngày",
  week: "Tuần",
  month: "Tháng",
  agenda: "Danh sách",
};

interface CalendarToolbarProps<TEvent extends object>
  extends ToolbarProps<TEvent, object> {
  onCreate: () => void;
  feedTab: "events" | "tasks";
  onFeedTabChange: (v: "events" | "tasks") => void;
  calendarMode: CalendarMode;
  onCalendarModeChange: (next: CalendarMode) => void;
  roomResourceId: ID | null;
  onRoomResourceIdChange: (next: ID | null) => void;
}

/**
 * Header strip rendered above the calendar grid (replaces RBC's default
 * toolbar). Owns: today/prev/next nav, range-label popover (jump to any
 * day), feed tabs (Sự kiện / Việc cần làm), view picker, +Tạo mới.
 */
export function CalendarToolbar<TEvent extends object>(
  props: CalendarToolbarProps<TEvent>,
): ReactNode {
  const {
    date,
    view,
    onNavigate,
    onView,
    onCreate,
    feedTab,
    onFeedTabChange,
    calendarMode,
    onCalendarModeChange,
    roomResourceId,
    onRoomResourceIdChange,
  } = props;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <RoomModeSwitcher
          mode={calendarMode}
          onModeChange={onCalendarModeChange}
          roomId={roomResourceId}
          onRoomIdChange={onRoomResourceIdChange}
        />
        <span className="mx-1 hidden h-6 w-px bg-border md:inline-block" />
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => onNavigate("TODAY")}
        >
          Hôm nay
        </Button>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => onNavigate("PREV")}
            aria-label="Trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => onNavigate("NEXT")}
            aria-label="Sau"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <DateRangePickerPopover
          view={view}
          date={date}
          onSelect={(d) => onNavigate("DATE", d)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          value={feedTab}
          onValueChange={(v) => onFeedTabChange(v as "events" | "tasks")}
        >
          <TabsList className="h-9">
            <TabsTrigger value="events" className="gap-1.5 text-xs">
              <CalendarIcon className="h-3.5 w-3.5" />
              Sự kiện
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="gap-1.5 text-xs"
              disabled
              title="Sắp ra mắt"
            >
              <ListTodo className="h-3.5 w-3.5" />
              Việc cần làm
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={view} onValueChange={(v) => onView(v as View)}>
          <SelectTrigger className="h-9 w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["day", "week", "month", "agenda"] as View[]).map((v) => (
              <SelectItem key={v} value={v}>
                {VIEW_LABELS[v]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={onCreate} size="sm" className={cn("h-9 gap-1.5")}>
          <Plus className="h-4 w-4" />
          Tạo mới
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          aria-label="Cài đặt"
          disabled
          title="Sắp ra mắt"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
