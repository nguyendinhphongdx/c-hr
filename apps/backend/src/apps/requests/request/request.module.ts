import { Module } from '@nestjs/common';

import { HrmModule } from '@/apps/hrm/hrm.module';

import { RequestGroupModule } from '../request-group/request-group.module';

import { RequestController } from './request.controller';
import { RequestRepository } from './request.repository';
import { RequestService } from './request.service';

@Module({
  imports: [HrmModule, RequestGroupModule],
  controllers: [RequestController],
  providers: [RequestService, RequestRepository],
  exports: [RequestService, RequestRepository],
})
export class RequestModule {}
