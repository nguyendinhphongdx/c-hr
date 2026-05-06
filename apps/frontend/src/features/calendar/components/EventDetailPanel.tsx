"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";

import { Button } from "@/components/ui/button";

import type { EventDetail } from "../types";

interface EventDetailPanelProps {
  event: EventDetail;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * Bottom strip rendered under the calendar grid when the user picks an
 * event. Reads ACL `view` flags from the detail payload to gate the
 * Edit / Delete buttons; close-button always available.
 */
export function EventDetailPanel({
  event,
  onEdit,
  onDelete,
  onClose,
}: EventDetailPanelProps) {
  return (
    <div className="border-t bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm border border-primary/50 bg-primary/15" />
            <h3 className="truncate text-base font-semibold">{event.title}</h3>
            {event.status === "CANCELLED" && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Đã huỷ
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {format(new Date(event.startAt), "EEEE dd/MM HH:mm", { locale: vi })} →{" "}
            {format(new Date(event.endAt), "HH:mm dd/MM", { locale: vi })}
          </p>
          {event.location && <p className="mt-1 text-sm">📍 {event.location}</p>}
          {event.description && (
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
              {event.description}
            </p>
          )}
          {event.attendees.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {event.attendees.length} người được mời
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          {event.view.canEdit && (
            <Button size="sm" variant="outline" onClick={onEdit}>
              Sửa
            </Button>
          )}
          {event.view.canDelete && (
            <Button size="sm" variant="destructive" onClick={onDelete}>
              Xoá
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
