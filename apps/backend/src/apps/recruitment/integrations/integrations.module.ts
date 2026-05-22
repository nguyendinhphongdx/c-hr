import { Module } from '@nestjs/common';

import { AdapterRegistry } from './adapter.registry';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';
import { PostingController } from './posting.controller';
import { PostingService } from './posting.service';
import { TalentVnAdapter } from './talent-vn/talent-vn.adapter';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  controllers: [IntegrationController, PostingController, WebhookController],
  providers: [
    IntegrationService,
    PostingService,
    WebhookService,
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
