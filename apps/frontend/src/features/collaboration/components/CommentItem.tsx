"use client";

import { Lock, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

import type {
  CommentDto,
  UpdateCommentInput,
} from "../types";
import { CommentEditor } from "./CommentEditor";

const EDIT_WINDOW_MS = 15 * 60 * 1000;

interface CommentItemProps {
  comment: CommentDto;
  currentUserId?: ID;
  onUpdate?: (id: ID, data: UpdateCommentInput) => Promise<void>;
  onDelete?: (id: ID) => Promise<void>;
  /** Indented when rendered as a reply. */
  isReply?: boolean;
}

function formatRelativeVi(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "vừa xong";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export function CommentItem({
  comment,
  currentUserId,
  onUpdate,
  onDelete,
  isReply,
}: CommentItemProps) {
  const [editing, setEditing] = useState(false);

  const isDeleted = !!comment.deletedAt;
  const isAuthor = currentUserId && comment.userId === currentUserId;
  // Lazy init reads Date.now once at mount — pure from React's POV (commit
  // phase). The timer effect below only fires *outside* render, satisfying the
  // react-hooks/set-state-in-effect rule.
  const [withinEditWindow, setWithinEditWindow] = useState(
    () => Date.now() - new Date(comment.createdAt).getTime() < EDIT_WINDOW_MS,
  );
  useEffect(() => {
    if (!withinEditWindow) return;
    const created = new Date(comment.createdAt).getTime();
    const remaining = EDIT_WINDOW_MS - (Date.now() - created);
    if (remaining <= 0) return;
    const timer = setTimeout(() => setWithinEditWindow(false), remaining);
    return () => clearTimeout(timer);
  }, [comment.createdAt, withinEditWindow]);
  const canEdit = !isDeleted && isAuthor && withinEditWindow && !!onUpdate;
  const canDelete = !isDeleted && isAuthor && !!onDelete;

  const userName = comment.user?.name ?? "Người dùng";
  const userAvatar = comment.user?.avatar ?? undefined;

  if (editing && onUpdate) {
    return (
      <div className={cn("flex gap-3", isReply && "ml-10")}>
        <Avatar className="h-8 w-8">
          {userAvatar ? <AvatarImage src={userAvatar} alt={userName} /> : null}
          <AvatarFallback>{initials(userName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <CommentEditor
            initialHtml={comment.bodyHtml}
            submitLabel="Lưu"
            onCancel={() => setEditing(false)}
            onSubmit={async (bodyHtml) => {
              await onUpdate(comment.id, { bodyHtml });
              setEditing(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-3",
        isReply && "ml-10",
        isDeleted && "opacity-60",
      )}
    >
      <Avatar className="h-8 w-8">
        {userAvatar ? <AvatarImage src={userAvatar} alt={userName} /> : null}
        <AvatarFallback>{initials(userName)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{userName}</span>
          <span>·</span>
          <span>{formatRelativeVi(comment.createdAt)}</span>
          {comment.editedAt ? <span>(đã sửa)</span> : null}
          {comment.isInternal ? (
            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <Lock className="size-3" /> Nội bộ
            </span>
          ) : null}
        </div>

        {isDeleted ? (
          <p className="mt-1 italic text-sm text-muted-foreground">[Đã xoá]</p>
        ) : (
          // BE sanitizes via sanitize-html (F6 plan).
          <div
            className="prose prose-sm dark:prose-invert mt-1 max-w-none wrap-break-word"
            dangerouslySetInnerHTML={{ __html: comment.bodyHtml }}
          />
        )}

        {(canEdit || canDelete) && (
          <div className="mt-1 flex gap-1">
            {canEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-3" /> Sửa
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                onClick={() => onDelete?.(comment.id)}
              >
                <Trash2 className="size-3" /> Xoá
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
