import type { ID, ISODate, Nullable } from "@/lib/types";

/** Polymorphic ref — uppercase Pascal model name like "Request", "Employee". */
export type ObjectType = string;

export interface Mention {
  userId: ID;
  name?: string;
}

export interface CollaborationUser {
  id: ID;
  name: Nullable<string>;
  avatar: Nullable<string>;
  email: string;
}

export interface CommentDto {
  id: ID;
  organizationId: ID;
  objectType: ObjectType;
  objectId: ID;
  objectRef: string;
  userId: ID;
  bodyHtml: string;
  bodyText: string;
  mentions: Mention[] | null;
  parentId: Nullable<ID>;
  isInternal: boolean;
  editedAt: Nullable<ISODate>;
  deletedAt: Nullable<ISODate>;
  createdAt: ISODate;
  updatedAt: ISODate;
  /** Optional — BE may not always eager-load. */
  user?: CollaborationUser;
}

export interface ActivityDto {
  id: ID;
  organizationId: ID;
  objectType: ObjectType;
  objectId: ID;
  objectRef: string;
  action: string;
  userId: Nullable<ID>;
  objectLabel: Nullable<string>;
  metadata: Record<string, unknown> | null;
  createdAt: ISODate;
  /** Optional — BE may not always eager-load. */
  user?: CollaborationUser;
}

export interface CreateCommentInput {
  bodyHtml: string;
  parentId?: ID;
  isInternal?: boolean;
  mentions?: Mention[];
}

export interface UpdateCommentInput {
  bodyHtml: string;
  mentions?: Mention[];
}

export interface ListCommentsOptions {
  limit?: number;
  cursor?: string;
}

export interface ListActivitiesOptions {
  limit?: number;
  cursor?: string;
}
