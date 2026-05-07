"use client";

import { Building2, CalendarDays, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

import { useResources } from "../hooks/useResources";

export type CalendarMode = "calendar" | "rooms";

interface RoomModeSwitcherProps {
  mode: CalendarMode;
  onModeChange: (next: CalendarMode) => void;
  /** Resource id when in rooms mode. Null = "no room picked yet". */
  roomId: ID | null;
  onRoomIdChange: (next: ID | null) => void;
}

/**
 * Top-left segmented control: "Lịch" (personal events) ↔ "Phòng họp"
 * (single-room calendar). When the rooms tab is active, a room
 * picker chip appears next to it for choosing which room to view.
 */
export function RoomModeSwitcher({
  mode,
  onModeChange,
  roomId,
  onRoomIdChange,
}: RoomModeSwitcherProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const rooms = useResources({ kind: "ROOM", activeOnly: true });

  const selectedName = useMemo(() => {
    if (!roomId) return null;
    return rooms.data?.find((r) => r.id === roomId)?.name ?? null;
  }, [roomId, rooms.data]);

  return (
    <div className="flex items-center gap-2">
      <Tabs value={mode} onValueChange={(v) => onModeChange(v as CalendarMode)}>
        <TabsList className="h-9">
          <TabsTrigger value="calendar" className="gap-1.5 text-xs">
            <CalendarDays className="h-3.5 w-3.5" />
            Lịch
          </TabsTrigger>
          <TabsTrigger value="rooms" className="gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5" />
            Phòng họp
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === "rooms" && (
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-1.5 text-xs",
                !selectedName && "text-muted-foreground",
              )}
            >
              {selectedName ?? "Chọn phòng..."}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-0">
            <div className="max-h-64 overflow-y-auto py-1">
              {rooms.isLoading ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Đang tải...
                </p>
              ) : (rooms.data ?? []).length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Chưa có phòng họp nào. Thêm trong{" "}
                  <span className="font-medium">Quản trị → Tài nguyên</span>.
                </p>
              ) : (
                rooms.data!.map((r) => {
                  const active = roomId === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        onRoomIdChange(r.id);
                        setPickerOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent/50",
                        active && "bg-accent/40 font-medium",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{r.name}</span>
                      {r.location && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {r.location}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
