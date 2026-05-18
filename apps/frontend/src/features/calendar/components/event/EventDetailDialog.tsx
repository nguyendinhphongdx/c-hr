"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Building2, Clock, MapPin, UserRound } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/features/auth";
import {
  CommentComposer,
  UnifiedTimeline,
  useDeleteComment,
  useUpdateComment,
} from "@/features/collaboration";
import { ImageLightboxScope } from "@/components/shared/ImagePreview";
import { encodeObjectRef } from "@/lib/object-ref";
import { cn } from "@/lib/utils";

import type {
  AttendeeResponse,
  EventAttendeeRow,
  EventDetail,
  EventStatus,
} from "../../types";

interface EventDetailDialogProps {
  event: EventDetail | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function EventDetailDialog({
  event,
  open,
  onClose,
  onEdit,
  onDelete,
}: EventDetailDialogProps) {
  const { user } = useAuth();

  const objectRef = event
    ? encodeObjectRef({ objectType: "Event", objectId: event.id })
    : "";
  const updateComment = useUpdateComment(objectRef);
  const deleteComment = useDeleteComment(objectRef);

  return (
    <Dialog open={open && !!event} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden p-0">
        {event && (
          <div className="flex max-h-[90vh] flex-col overflow-hidden">
            <div className="grid min-h-0 grid-cols-1 gap-0 overflow-y-auto md:grid-cols-[1fr_280px]">
              <div className="flex min-h-0 flex-col p-6">
                <DialogTitle className="pr-8 text-lg font-semibold leading-snug">
                  {event.title}
                </DialogTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Trạng thái:{" "}
                  <span
                    className={cn(
                      "font-medium",
                      formatStatus(event.status).className,
                    )}
                  >
                    {formatStatus(event.status).label}
                  </span>
                </p>

                <div className="mt-4 space-y-2 text-sm">
                  {event.location && (
                    <MetaRow
                      icon={<MapPin className="h-4 w-4" />}
                      text={event.location}
                    />
                  )}
                  {event.resources && event.resources.length > 0 && (
                    <MetaRow
                      icon={<Building2 className="h-4 w-4" />}
                      text={event.resources
                        .map((r) => r.resourceNameSnapshot ?? r.resource.name)
                        .join(", ")}
                    />
                  )}
                  <MetaRow
                    icon={<Clock className="h-4 w-4" />}
                    text={`${format(new Date(event.startAt), "EEEE dd/MM HH:mm", { locale: vi })} → ${format(new Date(event.endAt), "HH:mm dd/MM", { locale: vi })}`}
                  />
                  <MetaRow
                    icon={<UserRound className="h-4 w-4" />}
                    text={`Tạo bởi ${displayName(event.createdBy)} vào lúc ${format(new Date(event.createdAt), "HH:mm dd/MM/yyyy", { locale: vi })}`}
                  />
                </div>

                {event.attendees.length > 0 && (
                  <div className="mt-5">
                    <SectionHeader>Người theo dõi</SectionHeader>
                    <AttendeeRow attendees={event.attendees} />
                  </div>
                )}

                {event.description && (
                  <div className="mt-5">
                    <SectionHeader>Mô tả</SectionHeader>
                    <ImageLightboxScope>
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: event.description }}
                      />
                    </ImageLightboxScope>
                  </div>
                )}

                <div className="mt-6 border-t pt-4">
                  <SectionHeader>Bình luận</SectionHeader>
                  <UnifiedTimeline
                    objectRef={objectRef}
                    currentUserId={user?.id}
                    onUpdateComment={(id, data) =>
                      updateComment
                        .mutateAsync({ id, data })
                        .then(() => undefined)
                    }
                    onDeleteComment={(id) =>
                      deleteComment.mutateAsync(id).then(() => undefined)
                    }
                  />
                  <div className="mt-3">
                    <CommentComposer objectRef={objectRef} />
                  </div>
                </div>
              </div>

              <aside className="hidden min-h-0 overflow-y-auto border-l bg-muted/30 p-4 md:block">
                {event.resources && event.resources.length > 0 && (
                  <SidebarSection
                    title="Thông tin của tài nguyên"
                    defaultOpen
                  >
                    <ul className="space-y-3">
                      {event.resources.map((r) => (
                        <li key={r.id} className="text-sm">
                          <p className="font-medium">
                            {r.resourceNameSnapshot ?? r.resource.name}
                          </p>
                          {r.resource.location && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {r.resource.location}
                            </p>
                          )}
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {kindLabel(r.resource.kind)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </SidebarSection>
                )}

                <SidebarSection title="Tệp đính kèm">
                  <p className="text-xs text-muted-foreground">Sắp ra mắt</p>
                </SidebarSection>

                {event.attendees.length > 0 && (
                  <SidebarSection title="Người theo dõi" defaultOpen>
                    <ul className="space-y-2">
                      {event.attendees.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Avatar size="sm">
                            <AvatarImage src={a.user?.avatar ?? undefined} />
                            <AvatarFallback>
                              {initials(attendeeName(a))}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">
                              {attendeeName(a)}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {responseLabel(a.response)}
                              {a.isOrganizer ? " · Người tổ chức" : ""}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </SidebarSection>
                )}
              </aside>
            </div>

            {(event.view.canEdit || event.view.canDelete) && (
              <div className="flex shrink-0 justify-end gap-2 border-t bg-background px-6 py-3">
                {event.view.canEdit && (
                  <Button variant="outline" onClick={onEdit}>
                    Sửa
                  </Button>
                )}
                {event.view.canDelete && (
                  <Button variant="destructive" onClick={onDelete}>
                    Xoá
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MetaRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-muted-foreground">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="text-foreground">{text}</span>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h4>
  );
}

function SidebarSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group mb-3 border-b border-border/60 pb-3 last:border-b-0 last:pb-0"
    >
      <summary className="flex cursor-pointer list-none items-center gap-1.5 pr-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
        <span className="text-sm leading-none transition-transform group-open:rotate-90">
          ›
        </span>
        <span>{title}</span>
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

function AttendeeRow({ attendees }: { attendees: EventAttendeeRow[] }) {
  const { shown, overflow } = attendeesPreview(attendees, 5);
  return (
    <div className="flex items-center gap-2">
      {shown.map((a) => (
        <Avatar key={a.id} size="sm" title={attendeeName(a)}>
          <AvatarImage src={a.user?.avatar ?? undefined} />
          <AvatarFallback>{initials(attendeeName(a))}</AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  );
}

function attendeesPreview(list: EventAttendeeRow[], max = 5) {
  if (list.length <= max) return { shown: list, overflow: 0 };
  return { shown: list.slice(0, max), overflow: list.length - max };
}

function attendeeName(a: EventAttendeeRow): string {
  return (
    a.user?.name ??
    a.displayName ??
    a.user?.email ??
    a.email ??
    "Khách"
  );
}

function displayName(u: { name: string | null; email: string }): string {
  return u.name ?? u.email;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

function formatStatus(status: EventStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "CONFIRMED":
      return { label: "Đã xác nhận", className: "text-emerald-600" };
    case "TENTATIVE":
      return { label: "Tạm thời", className: "text-amber-600" };
    case "CANCELLED":
      return { label: "Đã huỷ", className: "text-muted-foreground" };
    default:
      return { label: String(status), className: "text-foreground" };
  }
}

function responseLabel(r: AttendeeResponse): string {
  switch (r) {
    case "ACCEPTED":
      return "Đã nhận";
    case "DECLINED":
      return "Đã từ chối";
    case "TENTATIVE":
      return "Tạm thời";
    case "PENDING":
    default:
      return "Đang chờ";
  }
}

function kindLabel(kind: "ROOM" | "EQUIPMENT" | "VEHICLE"): string {
  switch (kind) {
    case "ROOM":
      return "Phòng họp";
    case "EQUIPMENT":
      return "Thiết bị";
    case "VEHICLE":
      return "Phương tiện";
  }
}
