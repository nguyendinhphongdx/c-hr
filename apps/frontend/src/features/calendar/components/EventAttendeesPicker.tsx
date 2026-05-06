"use client";

import { X } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UserPicker, type OrgUser } from "@/features/users";
import type { ID } from "@/lib/types";

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
}

/**
 * Two-tier attendee picker — `Người chủ trì` (single) + `Người được mời`
 * (multi). Shows each invitee as a chip with a remove button. Uses the
 * shared `<UserPicker>` for the search popover; multi-select stacks
 * picks into the chip list.
 */
export function EventAttendeesPicker({
  organizer,
  onOrganizerChange,
  invitees,
  onInviteesChange,
  disabled,
}: EventAttendeesPickerProps) {
  const inviteeIdSet = useMemo(
    () => new Set(invitees.map((a) => a.userId)),
    [invitees],
  );

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
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>Người chủ trì</Label>
        <UserPicker
          value={organizer?.userId ?? null}
          onChange={(u) =>
            onOrganizerChange(
              u ? { userId: u.id, name: u.name, email: u.email } : null,
            )
          }
          placeholder="Chọn người chủ trì..."
          disabled={disabled}
          availableForLink={false}
          fallback={
            organizer ? { name: organizer.name, email: organizer.email } : null
          }
        />
      </div>

      <div className="grid gap-2">
        <Label>Người được mời</Label>
        <UserPicker
          // null value — picker acts as "add" rather than show selected.
          value={null}
          onChange={addInvitee}
          placeholder="Thêm người được mời..."
          disabled={disabled}
          availableForLink={false}
        />
        {invitees.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {invitees.map((a) => (
              <li
                key={a.userId}
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs"
              >
                <span className="max-w-40 truncate font-medium">
                  {a.name ?? a.email}
                </span>
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
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
