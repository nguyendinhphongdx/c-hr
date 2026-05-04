import { Module } from '@nestjs/common';

import { RequestGroupController } from './request-group.controller';
import { RequestGroupRepository } from './request-group.repository';
import { RequestGroupService } from './request-group.service';

@Module({
  controllers: [RequestGroupController],
  providers: [RequestGroupService, RequestGroupRepository],
  exports: [RequestGroupService, RequestGroupRepository],
})
export class RequestGroupModule {}
