import type { ID, ISODate, Nullable } from "@/lib/types";

export interface Tag {
  id: ID;
  organizationId: ID;
  name: string;
  /** Hex color in `#RRGGBB` form. */
  color: string;
  /** `null` = global tag (attaches to any objectType). */
  scope: Nullable<string>;
  createdAt: ISODate;
  updatedAt: ISODate;
  deletedAt: Nullable<ISODate>;
}

export interface TagAssignment {
  id: ID;
  organizationId: ID;
  tagId: ID;
  objectType: string;
  objectId: ID;
  createdById: ID;
  createdAt: ISODate;
}

export interface ListTagsQuery {
  /** Pass `"null"` to fetch only global tags (no scope). Omit for all. */
  scope?: string;
  q?: string;
}

export interface CreateTagInput {
  name: string;
  color: string;
  scope?: string | null;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
  scope?: string | null;
}

export interface AttachTagInput {
  tagId: ID;
  objectType: string;
  objectId: ID;
}

export interface BulkSetTagsInput {
  objectType: string;
  objectId: ID;
  tagIds: ID[];
}
