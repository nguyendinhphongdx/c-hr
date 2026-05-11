import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { RequestContextService } from '@/common/context';
import { JwtAuthGuard } from '@/common/guards';
import { PrismaService } from '@libs/database/prisma.service';

import { TimesheetSummaryQueryDto } from './dto';
import { buildTimesheetReportXlsx } from './lib/xlsx-report.builder';
import { TimesheetReportService } from './timesheet-report.service';

/**
 * Org-wide timesheet report endpoints. Gate: HRM appadmin (admin /
 * sysowner pass through `requireAppAdmin` hierarchy in the service).
 */
@ApiTags('timesheet-reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('timesheet/reports')
export class TimesheetReportController {
  constructor(
    private readonly service: TimesheetReportService,
    private readonly ctx: RequestContextService,
    private readonly prisma: PrismaService,
  ) {}

  /** Per-employee aggregated metrics for the period — main "Theo nhân sự" tab. */
  @Get('summary')
  summary(@Query() query: TimesheetSummaryQueryDto) {
    return this.service.summary(query);
  }

  /** Org-wide totals + 6-month trend + top lists — "Tổng quan" tab. */
  @Get('overview')
  overview(@Query() query: TimesheetSummaryQueryDto) {
    return this.service.overview(query);
  }

  /**
   * Same data as /summary but as an XLSX download. Streamed straight to
   * the client; no temp file. Auth gate runs inside `summary()` so query
   * tampering can't bypass it.
   */
  @Get('summary.xlsx')
  async summaryXlsx(
    @Query() query: TimesheetSummaryQueryDto,
    @Res({ passthrough: false }) res: Response,
  ) {
    const rows = await this.service.summary(query);
    const orgId = this.ctx.requireOrg();
    const userId = this.ctx.userId ?? null;

    const [org, user] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true },
      }),
      userId
        ? this.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true },
          })
        : Promise.resolve(null),
    ]);

    const buffer = buildTimesheetReportXlsx({
      rows,
      period: { from: query.from, to: query.to },
      orgName: org?.name ?? null,
      generatedBy: user?.name ?? user?.email ?? null,
    });

    const filename = `bao-cao-cham-cong_${query.from}_${query.to}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.end(buffer);
  }
}
