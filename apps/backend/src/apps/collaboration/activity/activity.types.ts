import { Activity } from '@prisma/client';

export interface LogActivityInput {
  organizationId: string;
  objectType: string;
  objectId: string;
  action: string;
  userId?: string | null;
  objectLabel?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ListActivitiesOptions {
  limit?: number;
  cursor?: string;
}

/**
 * Wire shape — Activity row + the `objectRef` token (computed from
 * `objectType + objectId`). Mirrors the CommentDto pattern: storage stays
 * 3 columns (org, type, id); the FE consumes a single token instead.
 */
export type ActivityDto = Activity & { objectRef: string };
