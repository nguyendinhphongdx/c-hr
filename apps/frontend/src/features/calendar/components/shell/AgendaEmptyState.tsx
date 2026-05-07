"use client";

import { CalendarRange, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface AgendaEmptyStateProps {
  onCreate: () => void;
}

/**
 * Replaces RBC's plain `noEventsInRange` span with a proper empty card.
 * Caller absolutely-positions this over the agenda body (below the
 * agenda's column-header row, which is ~48px tall).
 */
export function AgendaEmptyState({ onCreate }: AgendaEmptyStateProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-12 z-10 flex items-center justify-center bg-background p-6">
      <Empty className="pointer-events-auto max-w-md border bg-muted/20">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarRange />
          </EmptyMedia>
          <EmptyTitle>Chưa có sự kiện nào</EmptyTitle>
          <EmptyDescription>
            Khoảng thời gian này không có sự kiện. Tạo cuộc họp / lịch hẹn để
            bắt đầu.
          </EmptyDescription>
        </EmptyHeader>
        <Button onClick={onCreate} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Tạo sự kiện
        </Button>
      </Empty>
    </div>
  );
}
