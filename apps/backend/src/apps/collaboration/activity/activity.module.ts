import { Global, Module } from '@nestjs/common';

import { ActivityController } from './activity.controller';
import { ActivityRepository } from './activity.repository';
import { ActivityService } from './activity.service';

/**
 * Global so any feature module can inject `ActivityService` without
 * re-importing. Controller exposes the generic list endpoint
 * (`GET /activities?token=`); domain side-effect logging stays in
 * services that call `service.log()` directly.
 */
@Global()
@Module({
  controllers: [ActivityController],
  providers: [ActivityService, ActivityRepository],
  exports: [ActivityService, ActivityRepository],
})
export class ActivityModule {}
