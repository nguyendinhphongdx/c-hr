import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

import { CurrentUser } from '@/common/decorators';
import { JwtAuthGuard } from '@/common/guards';
import { RequestUser } from '@/common/types';

import { OrgChartService } from './orgchart.service';

class EmployeeIdQueryDto {
  @IsUUID()
  employeeId: string;
}

@ApiTags('orgchart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orgchart')
export class OrgChartController {
  constructor(private readonly service: OrgChartService) {}

  @Get('department-tree')
  departmentTree(@CurrentUser() user: RequestUser) {
    return this.service.getDepartmentTree(user);
  }

  @Get('reporting-line')
  reportingLine(
    @CurrentUser() user: RequestUser,
    @Query() query: EmployeeIdQueryDto,
  ) {
    return this.service.getReportingLine(user, query.employeeId);
  }

  @Get('approver-candidates')
  approverCandidates(
    @CurrentUser() user: RequestUser,
    @Query() query: EmployeeIdQueryDto,
  ) {
    return this.service.getApproverCandidates(user, query.employeeId);
  }
}
