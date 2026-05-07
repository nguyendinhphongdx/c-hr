"use client";

import { X } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserPicker, type OrgUser } from "@/features/users";
import type { ID } from "@/lib/types";

import { useFreeBusy } from "../../hooks/useFreeBusy";
import type { FreeBusyRow } from "../../types";

export interface AttendeeDraft {
  userId: ID;
  name: string | null;
  email: string;
}

interface EventAttendeesPickerProps {
  /** Single organizer (chair). Optional — defaults to event owner if null. */
  organizer: AttendeeDraft | null;
  onOrganizerChange: (next: AttendeeDraft | null) => void;

  invitees: AttendeeDraft[];
  onInviteesChange: (next: AttendeeDraft[]) => void;

  disabled?: boolean;

  /** Slot bounds — when both set, free/busy badges render per attendee. */
  slotStart?: string;
  slotEnd?: string;
}

/**
 * Two-tier attendee picker — `Người chủ trì` (single) + `Người được mời`
 * (multi). Shows each invitee as a chip with a remove button. Uses the
 * shared `<UserPicker>` for the search popover; multi-select stacks
 * picks into the chip list.
 *
 * Phase 1 free/busy: when `slotStart` + `slotEnd` are passed, render a
 * Bận/Rảnh badge per row (organizer + each invitee).
 */
export function EventAttendeesPicker({
  organizer,
  onOrganizerChange,
  invitees,
  onInviteesChange,
  disabled,
  slotStart,
  slotEnd,
}: EventAttendeesPickerProps) {
  const inviteeIdSet = useMemo(
    () => new Set(invitees.map((a) => a.userId)),
    [invitees],
  );

  const userIds = useMemo(() => {
    const ids: ID[] = [];
    if (organizer?.userId) ids.push(organizer.userId);
    for (const a of invitees) if (a.userId) ids.push(a.userId);
    return Array.from(new Set(ids));
  }, [organizer, invitees]);

  const { byUserId, isLoading } = useFreeBusy({
    userIds,
    from: slotStart ?? null,
    to: slotEnd ?? null,
  });

  const showBadges = !!slotStart && !!slotEnd;

  const addInvitee = (u: OrgUser | null) => {
    if (!u) return;
    if (organizer?.userId === u.id) return; // already organizer
    if (inviteeIdSet.has(u.id)) return;
    onInviteesChange([
      ...invitees,
      { userId: u.id, name: u.name, email: u.email },
    ]);
  };

  const removeInvitee = (userId: ID) => {
    onInviteesChange(invitees.filter((a) => a.userId !== userId));
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label>Người chủ trì</Label>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <UserPicker
                value={organizer?.userId ?? null}
                onChange={(u) =>
                  onOrganizerChange(
                    u ? { userId: u.id, name: u.name, email: u.email } : null,
                  )
                }
                placeholder="Chọn người chủ trì..."
                disabled={disabled}
                fallback={
                  organizer
                    ? { name: organizer.name, email: organizer.email }
                    : null
                }
              />
            </div>
            {showBadges && organizer?.userId && !isLoading ? (
              <FreeBusyBadge row={byUserId.get(organizer.userId) ?? null} />
            ) : null}
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Người được mời</Label>
          <UserPicker
            // null value — picker acts as "add" rather than show selected.
            value={null}
            onChange={addInvitee}
            placeholder="Thêm người được mời..."
            disabled={disabled}
          />
          {invitees.length > 0 && (
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {invitees.map((a) => {
                const fb = a.userId ? (byUserId.get(a.userId) ?? null) : null;
                return (
                  <li
                    key={a.userId}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs"
                  >
                    <span className="max-w-40 truncate font-medium">
                      {a.name ?? a.email}
                    </span>
                    {showBadges && a.userId && !isLoading ? (
                      <FreeBusyBadge row={fb} />
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 rounded-full"
                      onClick={() => removeInvitee(a.userId)}
                      disabled={disabled}
                      aria-label={`Bỏ ${a.name ?? a.email}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

function formatRange(startAt: string, endAt: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  return `${fmt(startAt)}–${fmt(endAt)}`;
}

function FreeBusyBadge({ row }: { row: FreeBusyRow | null }) {
  if (!row) return null;
  // FREE is the default expectation — skip the badge to keep the picker
  // compact (a "Rảnh" pill on every row pushes chips into a second line
  // and triggers scroll). Only render the actionable "Bận" signal here;
  // the full Rảnh/Bận pair stays in the scheduling assistant headers.
  if (row.status === "FREE") return null;
  const tooltip = row.conflicts.length
    ? row.conflicts
        .map((c) => `${c.title} (${formatRange(c.startAt, c.endAt)})`)
        .join("\n")
    : "Bận";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className="h-5 cursor-help border-rose-200 bg-rose-50 px-1.5 text-[10px] text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
        >
          Bận
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="whitespace-pre-line">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
