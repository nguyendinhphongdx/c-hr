import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Comment, Prisma } from '@prisma/client';

import { ActivityService } from '@/apps/collaboration/activity/activity.service';
import { encodeObjectRef } from '@/common/object-ref';

import { CommentRepository } from './comment.repository';
import {
  CommentCreatedEvent,
  CommentDeletedEvent,
  CommentDto,
  CommentUpdatedEvent,
  CreateCommentInput,
  ListCommentsOptions,
  UpdateCommentInput,
} from './comment.types';
import { htmlToText, sanitize } from './sanitize';

const EDIT_WINDOW_MS = 15 * 60 * 1000;

/** Decorate a raw Comment row with the `objectRef` token. Storage stays
 *  3 columns (org, type, id); the wire shape gets a single token so the
 *  FE can pass `objectRef` as a single prop. */
function toCommentDto(row: Comment): CommentDto {
  return {
    ...row,
    objectRef: encodeObjectRef({
      objectType: row.objectType,
      objectId: row.objectId,
    }),
  };
}

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(
    private readonly repo: CommentRepository,
    private readonly activityService: ActivityService,
    private readonly events: EventEmitter2,
  ) {}

  async create(input: CreateCommentInput): Promise<CommentDto> {
    const bodyHtml = sanitize(input.bodyHtml);
    const bodyText = htmlToText(bodyHtml);
    if (!bodyText) {
      throw new BadRequestException('Comment body is empty after sanitize');
    }

    if (input.parentId) {
      await this.assertValidParent(
        input.parentId,
        input.organizationId,
        input.objectType,
        input.objectId,
      );
    }

    const created = await this.repo.create({
      organizationId: input.organizationId,
      objectType: input.objectType,
      objectId: input.objectId,
      userId: input.userId,
      bodyHtml,
      bodyText,
      mentions: this.toJsonMentions(input.mentions),
      parentId: input.parentId ?? null,
      isInternal: input.isInternal ?? false,
    });

    this.activityService.log({
      organizationId: input.organizationId,
      objectType: input.objectType,
      objectId: input.objectId,
      action: `${input.objectType.toLowerCase()}.commented`,
      userId: input.userId,
      metadata: {
        commentId: created.id,
        preview: bodyText.slice(0, 200),
      },
    });

    const payload: CommentCreatedEvent = {
      organizationId: input.organizationId,
      objectType: input.objectType,
      objectId: input.objectId,
      commentId: created.id,
      actorUserId: input.userId,
      bodyText,
      createdAt: created.createdAt,
    };
    this.events.emit('comment.created', payload);

    return toCommentDto(created);
  }

  async update(id: string, userId: string, input: UpdateCommentInput): Promise<CommentDto> {
    const existing = await this.repo.findById(id);
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Comment not found');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException('Chỉ tác giả mới được sửa comment');
    }
    if (Date.now() - existing.createdAt.getTime() > EDIT_WINDOW_MS) {
      throw new ForbiddenException('Quá hạn sửa');
    }

    const bodyHtml = sanitize(input.bodyHtml);
    const bodyText = htmlToText(bodyHtml);
    if (!bodyText) {
      throw new BadRequestException('Comment body is empty after sanitize');
    }

    const editedAt = new Date();
    const updated = await this.repo.update(id, {
      bodyHtml,
      bodyText,
      mentions: this.toJsonMentions(input.mentions),
      editedAt,
    });

    const payload: CommentUpdatedEvent = {
      organizationId: updated.organizationId,
      objectType: updated.objectType,
      objectId: updated.objectId,
      commentId: updated.id,
      actorUserId: userId,
      editedAt,
    };
    this.events.emit('comment.updated', payload);

    return toCommentDto(updated);
  }

  async softDelete(id: string, userId: string, allowModeration = false): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Comment not found');
    }
    if (existing.userId !== userId && !allowModeration) {
      throw new ForbiddenException('Chỉ tác giả mới được xoá comment');
    }
    await this.repo.softDelete(id);

    const payload: CommentDeletedEvent = {
      organizationId: existing.organizationId,
      objectType: existing.objectType,
      objectId: existing.objectId,
      commentId: existing.id,
      actorUserId: userId,
    };
    this.events.emit('comment.deleted', payload);
  }

  async listFor(
    orgId: string,
    objectType: string,
    objectId: string,
    opts?: ListCommentsOptions,
  ): Promise<CommentDto[]> {
    const rows = await this.repo.findManyByObject(orgId, objectType, objectId, opts);
    return rows.map(toCommentDto);
  }

  async findById(id: string): Promise<CommentDto | null> {
    const row = await this.repo.findById(id);
    return row ? toCommentDto(row) : null;
  }

  countFor(
    orgId: string,
    refs: Array<{ objectType: string; objectId: string }>,
  ): Promise<Map<string, number>> {
    return this.repo.countByObjects(orgId, refs);
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  private async assertValidParent(
    parentId: string,
    organizationId: string,
    objectType: string,
    objectId: string,
  ): Promise<void> {
    const parent = await this.repo.findById(parentId);
    if (
      !parent ||
      parent.deletedAt ||
      parent.organizationId !== organizationId ||
      parent.objectType !== objectType ||
      parent.objectId !== objectId
    ) {
      throw new BadRequestException('Parent comment not found on this object');
    }
    if (parent.parentId) {
      throw new BadRequestException('Replies are limited to one level');
    }
  }

  private toJsonMentions(
    mentions?: CreateCommentInput['mentions'],
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (!mentions || mentions.length === 0) return Prisma.JsonNull;
    return mentions as unknown as Prisma.InputJsonValue;
  }
}
