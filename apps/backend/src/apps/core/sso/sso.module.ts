import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { SsoConfigController } from './sso-config.controller';
import { SsoConfigService } from './sso-config.service';
import { EntraSsoController } from './entra/entra-sso.controller';
import { EntraSsoService } from './entra/entra-sso.service';
import { EntraStateStore } from './entra/entra-state.store';

@Module({
  imports: [AuthModule],
  controllers: [SsoConfigController, EntraSsoController],
  providers: [SsoConfigService, EntraSsoService, EntraStateStore],
  exports: [SsoConfigService],
})
export class SsoModule {}
