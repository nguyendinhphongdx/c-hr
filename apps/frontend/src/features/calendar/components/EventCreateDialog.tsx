"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { useCreateEvent, useUpdateEvent } from "../hooks/useEvents";
import type {
  CreateEventAttendeeInput,
  EventDetail,
  EventVisibility,
} from "../types";

import {
  EventAttendeesPicker,
  type AttendeeDraft,
} from "./EventAttendeesPicker";
import { EventAttachmentsField } from "./EventAttachmentsField";
import { EventDateTimeRow } from "./EventDateTimeRow";
import { EventVisibilityField } from "./EventVisibilityField";
import { ResourcePicker } from "./ResourcePicker";
import { RichTextDescriptionField } from "./RichTextDescriptionField";

const schema = z
  .object({
    title: z.string().min(1, "Bắt buộc").max(511),
    startDate: z.string().min(1, "Bắt buộc"),
    startTime: z.string().optional(),
    endDate: z.string().min(1, "Bắt buộc"),
    endTime: z.string().optional(),
    location: z.string().max(1023).optional(),
    conferenceUrl: z.string().max(1023).optional(),
    description: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    const start = stitchDateTime(v.startDate, v.startTime);
    const end = stitchDateTime(v.endDate, v.endTime);
    if (!start || !end) return;
    if (end <= start) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Kết thúc phải sau bắt đầu",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface EventCreateDialogProps {
  open: boolean;
  onClose: () => void;
  /** ISO datetime to pre-fill startAt — e.g. clicked slot. */
  initialStart?: string;
  initialEnd?: string;
  /** Pre-select these resources (e.g. dragging on a room row in /rooms). */
  initialResourceIds?: string[];
  /** Edit mode — if set, dialog updates instead of creates. */
  editing?: EventDetail | null;
}

function stitchDateTime(date: string, time: string | undefined): Date | null {
  if (!date) return null;
  const t = time && time.length === 5 ? time : "00:00";
  const dt = new Date(`${date}T${t}`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function splitIso(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

const EMPTY_FORM: FormValues = {
  title: "",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  location: "",
  conferenceUrl: "",
  description: "",
};

export function EventCreateDialog({
  open,
  onClose,
  initialStart,
  initialEnd,
  initialResourceIds,
  editing,
}: EventCreateDialogProps) {
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const submitting = create.isPending || update.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  });

  // Non-RHF state — these don't need full form integration; the submit
  // handler reads them when stitching the API payload.
  const [isAllDay, setIsAllDay] = useState(false);
  const [organizer, setOrganizer] = useState<AttendeeDraft | null>(null);
  const [invitees, setInvitees] = useState<AttendeeDraft[]>([]);
  const [visibility, setVisibility] = useState<EventVisibility>("DEFAULT");
  const [isPrivate, setIsPrivate] = useState(false);
  const [resourceIds, setResourceIds] = useState<string[]>([]);
  // UI-only — attachments aren't persisted yet (backend storage wire-in
  // is a follow-up). State lets the user see what they've selected and
  // remove items before submit.
  const [attachments, setAttachments] = useState<File[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Sync open / editing changes into the form. The setState calls below
  // are intentional — we mirror external props into local form state on
  // re-open, which matches RHF's `reset()` pattern in the same effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;

    if (editing) {
      const s = splitIso(editing.startAt);
      const e = splitIso(editing.endAt);
      form.reset({
        title: editing.title,
        startDate: s.date,
        startTime: s.time,
        endDate: e.date,
        endTime: e.time,
        location: editing.location ?? "",
        conferenceUrl: editing.conferenceUrl ?? "",
        description: editing.description ?? "",
      });
      setIsAllDay(editing.isAllDay);
      setVisibility(editing.visibility);
      setIsPrivate(editing.isPrivate);

      const orgAttendee = editing.attendees.find((a) => a.isOrganizer);
      setOrganizer(
        orgAttendee && orgAttendee.user
          ? {
              userId: orgAttendee.user.id,
              name: orgAttendee.user.name,
              email: orgAttendee.user.email,
            }
          : null,
      );
      setInvitees(
        editing.attendees
          .filter((a) => !a.isOrganizer && a.user)
          .map((a) => ({
            userId: a.user!.id,
            name: a.user!.name,
            email: a.user!.email,
          })),
      );
      setResourceIds(
        (editing.resources ?? []).map((r) => r.resourceId),
      );
      setAttachments([]);
      setAdvancedOpen(false);
    } else {
      const s = initialStart ? splitIso(initialStart) : { date: "", time: "" };
      const e = initialEnd ? splitIso(initialEnd) : { date: "", time: "" };
      form.reset({
        ...EMPTY_FORM,
        startDate: s.date,
        startTime: s.time,
        endDate: e.date,
        endTime: e.time,
      });
      setIsAllDay(false);
      setOrganizer(null);
      setInvitees([]);
      setVisibility("DEFAULT");
      setIsPrivate(false);
      setResourceIds(initialResourceIds ?? []);
      setAttachments([]);
      setAdvancedOpen(false);
    }
  }, [open, editing, initialStart, initialEnd, initialResourceIds, form]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const onSubmit = async (values: FormValues) => {
    const start = stitchDateTime(values.startDate, isAllDay ? "00:00" : values.startTime);
    let end = stitchDateTime(values.endDate, isAllDay ? "00:00" : values.endTime);
    if (!start || !end) {
      toast.error("Thời gian không hợp lệ");
      return;
    }
    if (isAllDay) {
      // All-day uses [startOfDay, endOfNextDay) — RBC + Google convention.
      end = new Date(end);
      end.setDate(end.getDate() + 1);
    }

    // Stitch attendees: organizer first (with isOrganizer flag), then invitees.
    const attendees: CreateEventAttendeeInput[] = [];
    if (organizer) {
      attendees.push({ userId: organizer.userId });
    }
    for (const a of invitees) {
      attendees.push({ userId: a.userId });
    }

    const basePayload = {
      title: values.title,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      isAllDay,
      location: values.location || undefined,
      conferenceUrl: values.conferenceUrl || undefined,
      description: values.description || undefined,
      visibility,
      isPrivate,
    };

    try {
      if (editing) {
        // Attendee list edits flow via dedicated /attendees endpoints —
        // we only patch the editable scalar fields here. Resource set
        // IS replaceable on update (`UpdateEventDto.resourceIds`).
        await update.mutateAsync({
          id: editing.id,
          data: { ...basePayload, resourceIds },
        });
        toast.success("Đã cập nhật sự kiện");
      } else {
        await create.mutateAsync({
          ...basePayload,
          attendees,
          resourceIds: resourceIds.length > 0 ? resourceIds : undefined,
        });
        toast.success("Đã tạo sự kiện");
      }
      onClose();
    } catch (err) {
      toast.error(
        editing ? "Không cập nhật được" : "Không tạo được sự kiện",
        {
          description:
            err instanceof Error ? err.message : "Vui lòng thử lại.",
        },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>
            {editing ? "Sửa sự kiện" : "Tạo sự kiện mới"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Cập nhật thông tin sự kiện."
              : "Điền thông tin để tạo cuộc họp / lịch hẹn."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên cuộc họp</FormLabel>
                  <FormControl>
                    <Input placeholder="Họp dự án X" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <EventDateTimeRow
              control={form.control}
              startDateName="startDate"
              startTimeName="startTime"
              endDateName="endDate"
              endTimeName="endTime"
              isAllDay={isAllDay}
              onAllDayChange={setIsAllDay}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa điểm</FormLabel>
                  <FormControl>
                    <Input placeholder="Phòng họp A / Online" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="conferenceUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link cuộc họp trực tuyến</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://meet.google.com/..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!editing && (
              <EventAttendeesPicker
                organizer={organizer}
                onOrganizerChange={setOrganizer}
                invitees={invitees}
                onInviteesChange={setInvitees}
                disabled={submitting}
              />
            )}

            <ResourcePicker
              value={resourceIds}
              onChange={setResourceIds}
              disabled={submitting}
            />

            <div className="grid gap-2">
              <FormLabel>Mô tả</FormLabel>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <RichTextDescriptionField
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    disabled={submitting}
                  />
                )}
              />
            </div>

            {/* Advanced — collapsed by default to keep dialog compact. */}
            <div className="rounded-md border bg-muted/20">
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm font-medium hover:bg-accent/40"
                onClick={() => setAdvancedOpen((v) => !v)}
              >
                {advancedOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                Tuỳ chọn nâng cao
              </button>
              {advancedOpen && (
                <div className="space-y-5 border-t px-3 py-4">
                  <EventAttachmentsField
                    files={attachments}
                    onChange={setAttachments}
                    disabled={submitting}
                  />
                  <EventVisibilityField
                    visibility={visibility}
                    onVisibilityChange={setVisibility}
                    isPrivate={isPrivate}
                    onIsPrivateChange={setIsPrivate}
                    disabled={submitting}
                  />
                </div>
              )}
            </div>
            </div>

            {/* Plain div instead of <DialogFooter> — the shadcn primitive
                applies negative margins meant to cancel a default p-4 on
                Dialog, which we've removed. */}
            <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-background px-6 py-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Huỷ
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                )}
                {editing ? "Lưu" : "Tạo"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
