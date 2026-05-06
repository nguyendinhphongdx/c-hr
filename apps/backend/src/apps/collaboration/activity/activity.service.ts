import { Injectable, Logger } from '@nestjs/common';
import { Activity, Prisma } from '@prisma/client';

import { encodeObjectRef } from '@/common/object-ref';

import { ActivityRepository } from './activity.repository';
import {
  ActivityDto,
  ListActivitiesOptions,
  LogActivityInput,
} from './activity.types';

/** Decorate a raw Activity row with the `objectRef` token, matching the
 *  CommentDto wire shape. Storage remains the 3 columns. */
function toActivityDto(row: Activity): ActivityDto {
  return {
    ...row,
    objectRef: encodeObjectRef({
      objectType: row.objectType,
      objectId: row.objectId,
    }),
  };
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly repo: ActivityRepository) {}

  /**
   * Fire-and-forget. Activity logging must never break the originating
   * business flow — failures are logged and swallowed.
   */
  log(input: LogActivityInput): void {
    this.repo.create(this.toCreateInput(input)).catch((err: unknown) => {
      this.logger.error(
        `activity log failed (${input.objectType}/${input.objectId} ${input.action}): ${(err as Error).message}`,
      );
    });
  }

  async logMany(inputs: LogActivityInput[]): Promise<void> {
    if (inputs.length === 0) return;
    try {
      await this.repo.createMany(inputs.map((i) => this.toCreateInput(i)));
    } catch (err) {
      this.logger.error(`activity logMany failed: ${(err as Error).message}`);
    }
  }

  async listFor(
    orgId: string,
    objectType: string,
    objectId: string,
    opts?: ListActivitiesOptions,
  ): Promise<ActivityDto[]> {
    const rows = await this.repo.findManyByObjectByOrg(
      orgId,
      objectType,
      objectId,
      opts,
    );
    return rows.map(toActivityDto);
  }

  private toCreateInput(i: LogActivityInput): Prisma.ActivityUncheckedCreateInput {
    return {
      organizationId: i.organizationId,
      objectType: i.objectType,
      objectId: i.objectId,
      action: i.action,
      userId: i.userId ?? null,
      objectLabel: i.objectLabel ?? null,
      metadata: (i.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    };
  }
}
