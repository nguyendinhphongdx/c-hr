"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, ChevronDown, ChevronRight, Clock, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useCreateEvent, useUpdateEvent } from "../../hooks/useEvents";
import { useResources } from "../../hooks/useResources";
import { useEventDraftStore } from "../../store/eventDraftStore";
import type { CreateEventAttendeeInput, EventDetail } from "../../types";
import { ResourcePicker } from "../resource/ResourcePicker";

import { EventAttendeesPicker } from "./EventAttendeesPicker";
import { EventAttachmentsField } from "./EventAttachmentsField";
import { EventDateTimeRow } from "./EventDateTimeRow";
import { EventVisibilityField } from "./EventVisibilityField";
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
  /** Pre-select resources when creating an event from a room row. */
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

export function EventCreateDialog({
  open,
  onClose,
  initialStart,
  initialEnd,
  initialResourceIds,
  editing,
}: EventCreateDialogProps) {
  const router = useRouter();
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const submitting = create.isPending || update.isPending;

  const draft = useEventDraftStore((s) => s.draft);
  const hydrationToken = useEventDraftStore((s) => s.hydrationToken);
  const setField = useEventDraftStore((s) => s.setField);
  const setOrganizer = useEventDraftStore((s) => s.setOrganizer);
  const setResourceIds = useEventDraftStore((s) => s.setResourceIds);
  const hydrateDefaults = useEventDraftStore((s) => s.hydrateDefaults);
  const hydrateFromEvent = useEventDraftStore((s) => s.hydrateFromEvent);
  const reset = useEventDraftStore((s) => s.reset);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: draft.title,
      startDate: draft.startDate,
      startTime: draft.startTime,
      endDate: draft.endDate,
      endTime: draft.endTime,
      location: draft.location,
      conferenceUrl: draft.conferenceUrl,
      description: draft.description,
    },
  });

  // UI-only — attachments aren't persisted yet.
  const [attachments, setAttachments] = useState<File[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Hydrate store on open. We re-run on dependency changes so that
  // re-opening with a different `editing` prop swaps the draft cleanly.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    if (editing) {
      hydrateFromEvent(editing);
    } else {
      hydrateDefaults({
        start: initialStart,
        end: initialEnd,
        resourceIds: initialResourceIds,
      });
    }
    setAttachments([]);
    setAdvancedOpen(false);
  }, [
    open,
    editing,
    initialStart,
    initialEnd,
    initialResourceIds,
    hydrateFromEvent,
    hydrateDefaults,
  ]);

  // Sync RHF when the store is hydrated (open / reset / edit-swap).
  useEffect(() => {
    form.reset({
      title: draft.title,
      startDate: draft.startDate,
      startTime: draft.startTime,
      endDate: draft.endDate,
      endTime: draft.endTime,
      location: draft.location,
      conferenceUrl: draft.conferenceUrl,
      description: draft.description,
    });
    // We intentionally only re-run on hydrationToken so user typing
    // doesn't loop back into RHF.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrationToken]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    const isAllDay = draft.isAllDay;
    const start = stitchDateTime(
      values.startDate,
      isAllDay ? "00:00" : values.startTime,
    );
    let end = stitchDateTime(
      values.endDate,
      isAllDay ? "00:00" : values.endTime,
    );
    if (!start || !end) {
      toast.error("Thời gian không hợp lệ");
      return;
    }
    if (isAllDay) {
      end = new Date(end);
      end.setDate(end.getDate() + 1);
    }

    const attendees: CreateEventAttendeeInput[] = [];
    if (draft.organizer) attendees.push({ userId: draft.organizer.userId });
    for (const a of draft.invitees) attendees.push({ userId: a.userId });

    const basePayload = {
      title: values.title,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      isAllDay,
      location: values.location || undefined,
      conferenceUrl: values.conferenceUrl || undefined,
      description: values.description || undefined,
      visibility: draft.visibility,
      isPrivate: draft.isPrivate,
    };

    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          data: { ...basePayload, resourceIds: draft.resourceIds },
        });
        toast.success("Đã cập nhật sự kiện");
      } else {
        await create.mutateAsync({
          ...basePayload,
          attendees,
          resourceIds:
            draft.resourceIds.length > 0 ? draft.resourceIds : undefined,
        });
        toast.success("Đã tạo sự kiện");
      }
      handleClose();
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

  // Capture form changes back into the store so the assistant page sees
  // the same values when the user switches tabs.
  const captureField = <K extends keyof FormValues>(
    key: K,
    value: FormValues[K],
  ) => {
    if (key === "title") setField("title", (value ?? "") as string);
    else if (key === "startDate") setField("startDate", (value ?? "") as string);
    else if (key === "startTime") setField("startTime", (value ?? "") as string);
    else if (key === "endDate") setField("endDate", (value ?? "") as string);
    else if (key === "endTime") setField("endTime", (value ?? "") as string);
    else if (key === "location") setField("location", (value ?? "") as string);
    else if (key === "conferenceUrl") setField("conferenceUrl", (value ?? "") as string);
    else if (key === "description") setField("description", (value ?? "") as string);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
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
                    <Input
                      placeholder="Họp dự án X"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        captureField("title", e.target.value);
                      }}
                    />
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
              isAllDay={draft.isAllDay}
              onAllDayChange={(v) => setField("isAllDay", v)}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa điểm</FormLabel>
                  <FormControl>
                    <LocationInputWithRoomPicker
                      value={field.value ?? ""}
                      onChange={(v) => {
                        field.onChange(v);
                        captureField("location", v);
                      }}
                      pickedResourceIds={draft.resourceIds}
                      onPickRoom={(room) => {
                        field.onChange(room.name);
                        captureField("location", room.name);
                        if (!draft.resourceIds.includes(room.id)) {
                          setResourceIds([...draft.resourceIds, room.id]);
                        }
                      }}
                      disabled={submitting}
                    />
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
                      onChange={(e) => {
                        field.onChange(e);
                        captureField("conferenceUrl", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!editing && (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/calendar/schedule")}
                  >
                    <Clock className="mr-1 h-3.5 w-3.5" />
                    Tìm khung trống
                  </Button>
                </div>
                <EventAttendeesPicker
                  organizer={draft.organizer}
                  onOrganizerChange={setOrganizer}
                  invitees={draft.invitees}
                  onInviteesChange={(next) =>
                    setField("invitees", next)
                  }
                  disabled={submitting}
                  slotStart={
                    stitchDateTime(
                      draft.startDate,
                      draft.isAllDay ? "00:00" : draft.startTime,
                    )?.toISOString()
                  }
                  slotEnd={
                    stitchDateTime(
                      draft.endDate,
                      draft.isAllDay ? "00:00" : draft.endTime,
                    )?.toISOString()
                  }
                />
              </div>
            )}

            <ResourcePicker
              value={draft.resourceIds}
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
                    onChange={(html) => {
                      field.onChange(html);
                      captureField("description", html);
                    }}
                    disabled={submitting}
                  />
                )}
              />
            </div>

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
                    visibility={draft.visibility}
                    onVisibilityChange={(v) => setField("visibility", v)}
                    isPrivate={draft.isPrivate}
                    onIsPrivateChange={(v) => setField("isPrivate", v)}
                    disabled={submitting}
                  />
                </div>
              )}
            </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-background px-6 py-3">
              <Button type="button" variant="outline" onClick={handleClose}>
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

interface RoomOption {
  id: string;
  name: string;
  location: string | null;
}

interface LocationInputWithRoomPickerProps {
  value: string;
  onChange: (v: string) => void;
  pickedResourceIds: string[];
  onPickRoom: (room: RoomOption) => void;
  disabled?: boolean;
}

function LocationInputWithRoomPicker({
  value,
  onChange,
  pickedResourceIds,
  onPickRoom,
  disabled,
}: LocationInputWithRoomPickerProps) {
  const [open, setOpen] = useState(false);
  const rooms = useResources({ kind: "ROOM", activeOnly: true });

  return (
    <div className="relative">
      <Input
        placeholder="Phòng họp A / Online"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="pr-10"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="Chọn phòng họp"
            className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            <Building2 className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-72 p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Phòng họp
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {rooms.isLoading ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Đang tải…
              </p>
            ) : !rooms.data?.length ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Chưa có phòng họp nào.
              </p>
            ) : (
              rooms.data.map((r) => {
                const picked = pickedResourceIds.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      onPickRoom({
                        id: r.id,
                        name: r.name,
                        location: r.location,
                      });
                      setOpen(false);
                    }}
                    className="flex w-full items-start gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent/50"
                  >
                    <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{r.name}</div>
                      {r.location && (
                        <div className="truncate text-[11px] text-muted-foreground">
                          {r.location}
                        </div>
                      )}
                    </div>
                    {picked && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        đã chọn
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
