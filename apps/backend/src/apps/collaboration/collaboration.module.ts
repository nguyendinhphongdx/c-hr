import { Global, Module } from '@nestjs/common';

import { ActivityModule } from './activity/activity.module';
import { CommentModule } from './comment/comment.module';
import { ObjectLoaderRegistry } from './registry/object-loader.registry';
import { TagModule } from './tag/tag.module';

@Global()
@Module({
  imports: [ActivityModule, CommentModule, TagModule],
  providers: [ObjectLoaderRegistry],
  exports: [ActivityModule, CommentModule, TagModule, ObjectLoaderRegistry],
})
export class CollaborationModule {}
