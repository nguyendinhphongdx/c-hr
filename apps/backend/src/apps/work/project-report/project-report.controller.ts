import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';

import { ProjectOverviewQueryDto } from './dto';
import { ProjectReportService } from './project-report.service';

/**
 * Reports surface for the Work app.
 *   - Per-project: KPI + burndown + workload (any project member).
 *   - Org-wide:    KPI + top projects + workload heatmap (HRM appadmin).
 *
 * Gates live inside the service so query-param tampering can't bypass
 * them.
 */
@ApiTags('work-reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ProjectReportController {
  constructor(private readonly service: ProjectReportService) {}

  @Get('projects/:projectId/reports/overview')
  projectOverview(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ProjectOverviewQueryDto,
  ) {
    return this.service.projectOverview(projectId, query);
  }

  @Get('work/reports/overview')
  orgOverview() {
    return this.service.orgOverview();
  }
}
