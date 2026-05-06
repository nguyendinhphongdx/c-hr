"use client";

import { useMemo } from "react";

import type { ID } from "@/lib/types";

import { useObjectActivities } from "../hooks/useObjectActivities";
import { useObjectComments } from "../hooks/useObjectComments";
import type {
  ActivityDto,
  CommentDto,
  UpdateCommentInput,
} from "../types";
import { ActivityTimeline } from "./ActivityTimeline";
import { CommentItem } from "./CommentItem";

type TimelineItem =
  | { kind: "comment"; data: CommentDto; createdAt: string }
  | { kind: "activity"; data: ActivityDto; createdAt: string };

interface UnifiedTimelineProps {
  objectRef: string;
  currentUserId?: ID;
  onUpdateComment?: (id: ID, data: UpdateCommentInput) => Promise<void>;
  onDeleteComment?: (id: ID) => Promise<void>;
  /** Hide the auto `*.commented` activity rows since the comment itself is rendered inline. */
  hideCommentedActivity?: boolean;
}

export function UnifiedTimeline({
  objectRef,
  currentUserId,
  onUpdateComment,
  onDeleteComment,
  hideCommentedActivity = true,
}: UnifiedTimelineProps) {
  const commentsQ = useObjectComments(objectRef);
  const activitiesQ = useObjectActivities(objectRef);

  // Order: oldest → newest. Audit feeds read top-down chronologically (matches
  // "Tạo đơn" first, "Đã duyệt" later) — Slack/Linear style for status threads.
  const items = useMemo<TimelineItem[]>(() => {
    const merged: TimelineItem[] = [];
    for (const c of commentsQ.data ?? []) {
      merged.push({ kind: "comment", data: c, createdAt: c.createdAt });
    }
    for (const a of activitiesQ.data ?? []) {
      if (hideCommentedActivity && a.action.endsWith(".commented")) continue;
      merged.push({ kind: "activity", data: a, createdAt: a.createdAt });
    }
    merged.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    return merged;
  }, [commentsQ.data, activitiesQ.data, hideCommentedActivity]);

  if (commentsQ.isLoading || activitiesQ.isLoading) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Đang tải...
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Chưa có hoạt động hay bình luận nào.
      </p>
    );
  }

  // Split into chunks of consecutive activities so we can render them via the
  // dedicated <ActivityTimeline/> for the icon styling, while comments use
  // <CommentItem/>. Keeps strict chronological order.
  const chunks: Array<
    | { kind: "comment"; data: CommentDto }
    | { kind: "activity"; data: ActivityDto[] }
  > = [];
  for (const it of items) {
    if (it.kind === "comment") {
      chunks.push({ kind: "comment", data: it.data });
    } else {
      const last = chunks[chunks.length - 1];
      if (last && last.kind === "activity") {
        last.data.push(it.data);
      } else {
        chunks.push({ kind: "activity", data: [it.data] });
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {chunks.map((chunk, idx) =>
        chunk.kind === "comment" ? (
          <CommentItem
            key={`c-${chunk.data.id}`}
            comment={chunk.data}
            currentUserId={currentUserId}
            onUpdate={onUpdateComment}
            onDelete={onDeleteComment}
          />
        ) : (
          <ActivityTimeline key={`a-${idx}`} activities={chunk.data} />
        ),
      )}
    </div>
  );
}
