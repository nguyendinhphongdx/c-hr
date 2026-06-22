import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';
import { InvitationRepository } from './invitation.repository';

@Module({
  imports: [AuthModule],
  controllers: [InvitationController],
  providers: [InvitationService, InvitationRepository],
  exports: [InvitationService],
})
export class InvitationModule {}
