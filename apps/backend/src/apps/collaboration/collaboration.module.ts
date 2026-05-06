import { Global, Module } from '@nestjs/common';

import { ActivityModule } from './activity/activity.module';
import { CommentModule } from './comment/comment.module';
import { ObjectLoaderRegistry } from './registry/object-loader.registry';

@Global()
@Module({
  imports: [ActivityModule, CommentModule],
  providers: [ObjectLoaderRegistry],
  exports: [ActivityModule, CommentModule, ObjectLoaderRegistry],
})
export class CollaborationModule {}
