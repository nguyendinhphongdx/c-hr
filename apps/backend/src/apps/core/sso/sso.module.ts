import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { InvitationModule } from '../invitation/invitation.module';

import { EntraSsoController } from './entra/entra-sso.controller';
import { EntraSsoService } from './entra/entra-sso.service';
import { EntraStateStore } from './entra/entra-state.store';
import { EntraOrphanStore } from './entra/entra-orphan.store';

@Module({
  imports: [AuthModule, InvitationModule],
  controllers: [EntraSsoController],
  providers: [EntraSsoService, EntraStateStore, EntraOrphanStore],
})
export class SsoModule {}
