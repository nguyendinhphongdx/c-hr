import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

import { JwtAuthGuard } from '@/common/guards';

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
  departmentTree() {
    return this.service.getDepartmentTree();
  }

  @Get('reporting-line')
  reportingLine(@Query() query: EmployeeIdQueryDto) {
    return this.service.getReportingLine(query.employeeId);
  }

  @Get('approver-candidates')
  approverCandidates(@Query() query: EmployeeIdQueryDto) {
    return this.service.getApproverCandidates(query.employeeId);
  }
}
