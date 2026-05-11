import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';

import { CommentCreatedEvent, CommentMention } from '@/apps/collaboration/comment/comment.types';
import { PrismaService } from '@libs/database/prisma.service';

/**
 * Auto-watch on @mention — when a Task comment mentions a user, upsert
 * that user into TaskWatcher so they get notified about future changes.
 *
 * Idempotent (skipDuplicates), org-scoped (mentioned user must belong to
 * the same Org). Listens fire-and-forget; failures are logged and
 * swallowed so a watcher-write hiccup never propagates back to the
 * comment author.
 *
 * TODO(notifications): once a real notification fan-out worker exists
 * (Phase 6+), reuse this listener as the place to push in-app + email.
 */
@Injectable()
export class TaskCommentWatchListener {
  private readonly logger = new Logger(TaskCommentWatchListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('comment.created', { async: true })
  async handle(payload: CommentCreatedEvent): Promise<void> {
    if (payload.objectType !== 'Task') return;

    try {
      const userIds = await this.collectMentionedUserIds(payload);
      if (userIds.length === 0) return;

      const allowed = await this.prisma.user.findMany({
        where: {
          id: { in: userIds },
          organizationId: payload.organizationId,
        },
        select: { id: true },
      });
      if (allowed.length === 0) return;

      await this.prisma.taskWatcher.createMany({
        data: allowed.map((u) => ({ taskId: payload.objectId, userId: u.id })),
        skipDuplicates: true,
      });
    } catch (e) {
      this.logger.error(
        `auto-watch on comment ${payload.commentId} failed: ${(e as Error).message}`,
      );
    }
  }

  /**
   * Sources mention user-ids from two places:
   *  1. The structured `mentions` JSON column (FE-provided, preferred).
   *  2. The bodyHtml `data-mention-user-id="UUID"` spans (Tiptap Mention
   *     extension output) — fallback in case the FE forgot to send the
   *     structured array.
   *
   * Returns deduped UUIDs only. Caller still org-validates downstream.
   */
  private async collectMentionedUserIds(payload: CommentCreatedEvent): Promise<string[]> {
    const row = await this.prisma.comment.findUnique({
      where: { id: payload.commentId },
      select: { mentions: true, bodyHtml: true },
    });
    if (!row) return [];

    const out = new Set<string>();

    const structured = row.mentions as Prisma.JsonValue;
    if (Array.isArray(structured)) {
      for (const raw of structured) {
        const m = raw as Partial<CommentMention> | null;
        if (m && typeof m.userId === 'string' && UUID_RE.test(m.userId)) {
          out.add(m.userId);
        }
      }
    }

    for (const match of row.bodyHtml.matchAll(MENTION_HTML_RE)) {
      const id = match[1];
      if (UUID_RE.test(id)) out.add(id);
    }

    return Array.from(out);
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MENTION_HTML_RE = /data-mention-user-id="([0-9a-fA-F-]{36})"/g;
