import { Module } from '@nestjs/common';

import { TagAssignmentController } from './tag-assignment.controller';
import { TagController } from './tag.controller';
import { TagRepository } from './tag.repository';
import { TagService } from './tag.service';

/**
 * Tag library + polymorphic assignments. Read [docs/decisions/0008] for the
 * BaseAcl pattern. Assignment writes delegate the gate to the target
 * object's ACL via the central `ObjectLoaderRegistry`.
 */
@Module({
  controllers: [TagController, TagAssignmentController],
  providers: [TagService, TagRepository],
  exports: [TagService, TagRepository],
})
export class TagModule {}
