import { Module } from '@nestjs/common';

import { AdapterRegistry } from './adapter.registry';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';
import { TalentVnAdapter } from './talent-vn/talent-vn.adapter';

@Module({
  controllers: [IntegrationController],
  providers: [IntegrationService, AdapterRegistry, TalentVnAdapter],
  exports: [IntegrationService, AdapterRegistry, TalentVnAdapter],
})
export class IntegrationsModule {}
