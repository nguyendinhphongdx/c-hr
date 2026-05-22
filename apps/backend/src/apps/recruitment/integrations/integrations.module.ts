import { Module } from '@nestjs/common';

import { AdapterRegistry } from './adapter.registry';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';
import { PostingController } from './posting.controller';
import { PostingService } from './posting.service';
import { TalentVnAdapter } from './talent-vn/talent-vn.adapter';

@Module({
  controllers: [IntegrationController, PostingController],
  providers: [
    IntegrationService,
    PostingService,
    AdapterRegistry,
    TalentVnAdapter,
  ],
  exports: [
    IntegrationService,
    PostingService,
    AdapterRegistry,
    TalentVnAdapter,
  ],
})
export class IntegrationsModule {}
