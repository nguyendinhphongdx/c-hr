import { Global, Module } from '@nestjs/common';

import { CommentController } from './comment.controller';
import { CommentRepository } from './comment.repository';
import { CommentService } from './comment.service';

/**
 * Global so any feature module (Request, Employee, ...) can inject
 * `CommentService` without re-importing. Controller exposes only the two
 * author-self routes (PATCH/DELETE :id); list/create are delegated to
 * per-feature controllers that own the object's ACL — see F6 plan.
 */
@Global()
@Module({
  controllers: [CommentController],
  providers: [CommentService, CommentRepository],
  exports: [CommentService, CommentRepository],
})
export class CommentModule {}
