import { Module } from '@nestjs/common';

import { AppAdminModule } from './app-admin/app-admin.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { OrganizationModule } from './organization/organization.module';
import { UserModule } from './user/user.module';

/**
 * Core bounded context — auth + user + organization + app-admin + health.
 *
 * Cross-cutting concerns that every other app (HRM, Attendance, Requests)
 * depends on. See ADR 0005 (docs/decisions/0005-folder-structure-bounded-contexts.md).
 */
@Module({
  imports: [
    AuthModule,
    UserModule,
    OrganizationModule,
    AppAdminModule,
    HealthModule,
  ],
  exports: [AuthModule, UserModule, OrganizationModule, AppAdminModule],
})
export class CoreModule {}
