import { Comment } from '@prisma/client';

export interface CommentMention {
  userId: string;
  name?: string;
}

export interface CreateCommentInput {
  organizationId: string;
  objectType: string;
  objectId: string;
  userId: string;
  bodyHtml: string;
  parentId?: string | null;
  isInternal?: boolean;
  mentions?: CommentMention[];
}

export interface UpdateCommentInput {
  bodyHtml: string;
  mentions?: CommentMention[];
}

export interface ListCommentsOptions {
  /** null = top-level only; undefined = flat all levels. */
  parentId?: string | null;
  /** When false, internal comments are filtered out of the result. */
  includeInternal?: boolean;
  limit?: number;
  cursor?: string;
}

/** Event payload types so listeners can consume strongly-typed events
 *  without re-declaring the shape. Emitted fire-and-forget by
 *  CommentService after each successful mutation. */
export interface CommentCreatedEvent {
  organizationId: string;
  objectType: string;
  objectId: string;
  commentId: string;
  actorUserId: string;
  bodyText: string;
  createdAt: Date;
}

export interface CommentUpdatedEvent {
  organizationId: string;
  objectType: string;
  objectId: string;
  commentId: string;
  actorUserId: string;
  editedAt: Date;
}

export interface CommentDeletedEvent {
  organizationId: string;
  objectType: string;
  objectId: string;
  commentId: string;
  actorUserId: string;
}

/**
 * Wire shape — Comment row + the `objectRef` token (computed from
 * `objectType + objectId`). FE consumes the token instead of the two
 * fields so a single prop replaces two; BE persists/queries the original
 * columns.
 */
export type CommentDto = Comment & { objectRef: string };
