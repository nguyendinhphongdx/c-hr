import { Module } from '@nestjs/common';

import { ProjectModule } from '../project/project.module';

import { ProjectReportController } from './project-report.controller';
import { ProjectReportService } from './project-report.service';

@Module({
  imports: [ProjectModule],
  controllers: [ProjectReportController],
  providers: [ProjectReportService],
  exports: [ProjectReportService],
})
export class ProjectReportModule {}
