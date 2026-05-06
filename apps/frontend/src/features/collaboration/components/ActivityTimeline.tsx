"use client";

import {
  CheckCircle2,
  Clock,
  History,
  MessageSquare,
  PlusCircle,
  Settings2,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import type { ActivityDto } from "../types";

interface ActionMeta {
  icon: LucideIcon;
  label: string;
  iconClass?: string;
}

const ACTION_META: Record<string, ActionMeta> = {
  "request.created": {
    icon: PlusCircle,
    label: "Tạo đơn",
    iconClass: "text-sky-600 dark:text-sky-400",
  },
  "request.approved": {
    icon: CheckCircle2,
    label: "Đã duyệt",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  "request.rejected": {
    icon: XCircle,
    label: "Đã từ chối",
    iconClass: "text-rose-600 dark:text-rose-400",
  },
  "request.cancelled": {
    icon: XCircle,
    label: "Đã huỷ",
    iconClass: "text-muted-foreground",
  },
  "request.commented": {
    icon: MessageSquare,
    label: "Đã bình luận",
    iconClass: "text-indigo-600 dark:text-indigo-400",
  },
  "request.side_effect.checkin_corrected": {
    icon: Settings2,
    label: "Đã áp dụng chấm công",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  "request.side_effect.checkout_corrected": {
    icon: Settings2,
    label: "Đã áp dụng chấm công",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
};

function metaFor(action: string): ActionMeta {
  if (ACTION_META[action]) return ACTION_META[action];
  // Generic fallback for *.side_effect.* (covers future variants).
  if (action.includes(".side_effect."))
    return {
      icon: Settings2,
      label: "Đã áp dụng chấm công",
      iconClass: "text-amber-600 dark:text-amber-400",
    };
  return { icon: History, label: action };
}

function formatTimeVi(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min} phút trước`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  return new Date(iso).toLocaleString("vi-VN");
}

function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

interface ActivityTimelineProps {
  activities: ActivityDto[];
  emptyText?: string;
}

export function ActivityTimeline({
  activities,
  emptyText = "Chưa có hoạt động nào.",
}: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }
  return (
    <ol className="flex flex-col gap-3">
      {activities.map((a) => {
        const meta = metaFor(a.action);
        const Icon = meta.icon;
        const userName = a.user?.name ?? (a.userId ? "Người dùng" : "Hệ thống");
        return (
          <li key={a.id} className="flex items-start gap-3">
            <div className="relative mt-0.5">
              <Avatar className="h-7 w-7">
                {a.user?.avatar ? (
                  <AvatarImage src={a.user.avatar} alt={userName} />
                ) : null}
                <AvatarFallback>{initials(userName)}</AvatarFallback>
              </Avatar>
              <span className="absolute -right-1 -bottom-1 inline-flex size-4 items-center justify-center rounded-full bg-background ring-1 ring-border">
                <Icon className={`size-3 ${meta.iconClass ?? ""}`} />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{userName}</span>{" "}
                <span className="text-muted-foreground">{meta.label}</span>
              </p>
              {a.objectLabel ? (
                <p className="text-xs text-muted-foreground truncate">
                  {a.objectLabel}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Clock className="size-3" />
                {formatTimeVi(a.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
