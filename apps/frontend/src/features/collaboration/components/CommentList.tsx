"use client";

import { useMemo } from "react";

import type { ID } from "@/lib/types";

import type { CommentDto, UpdateCommentInput } from "../types";
import { CommentItem } from "./CommentItem";

interface CommentListProps {
  comments: CommentDto[];
  currentUserId?: ID;
  onUpdate?: (id: ID, data: UpdateCommentInput) => Promise<void>;
  onDelete?: (id: ID) => Promise<void>;
  emptyText?: string;
}

interface ThreadNode {
  comment: CommentDto;
  replies: CommentDto[];
}

export function CommentList({
  comments,
  currentUserId,
  onUpdate,
  onDelete,
  emptyText = "Chưa có bình luận nào.",
}: CommentListProps) {
  const threads = useMemo<ThreadNode[]>(() => {
    const tops = comments
      .filter((c) => !c.parentId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    const repliesByParent = new Map<ID, CommentDto[]>();
    for (const c of comments) {
      if (!c.parentId) continue;
      const arr = repliesByParent.get(c.parentId) ?? [];
      arr.push(c);
      repliesByParent.set(c.parentId, arr);
    }
    for (const arr of repliesByParent.values()) {
      arr.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }
    return tops.map((c) => ({
      comment: c,
      replies: repliesByParent.get(c.id) ?? [],
    }));
  }, [comments]);

  if (threads.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {threads.map(({ comment, replies }) => (
        <div key={comment.id} className="flex flex-col gap-3">
          <CommentItem
            comment={comment}
            currentUserId={currentUserId}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onUpdate={onUpdate}
              onDelete={onDelete}
              isReply
            />
          ))}
        </div>
      ))}
    </div>
  );
}
