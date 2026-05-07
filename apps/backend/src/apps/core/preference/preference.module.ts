import { Global, Module } from '@nestjs/common';

import { PreferenceController } from './preference.controller';
import { PreferenceRepository } from './preference.repository';
import { PreferenceService } from './preference.service';

/**
 * Generic per-user/per-org/per-employee preference store. Marked
 * `@Global()` so any feature module (e.g. calendar) can inject
 * `PreferenceService` without re-importing here. Domain-specific keys
 * register themselves in `preference.registry.ts`.
 */
@Global()
@Module({
  controllers: [PreferenceController],
  providers: [PreferenceService, PreferenceRepository],
  exports: [PreferenceService],
})
export class PreferenceModule {}
