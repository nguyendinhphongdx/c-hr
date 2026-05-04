import { Module } from '@nestjs/common';

import { AppAdminController } from './app-admin.controller';
import { AppAdminRepository } from './app-admin.repository';
import { AppAdminService } from './app-admin.service';

@Module({
  controllers: [AppAdminController],
  providers: [AppAdminService, AppAdminRepository],
  exports: [AppAdminService],
})
export class AppAdminModule {}
