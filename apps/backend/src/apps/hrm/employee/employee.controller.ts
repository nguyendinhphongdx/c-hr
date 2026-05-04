import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auditable } from '@/common/audit';
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';

import { CreateEmployeeDto, ListEmployeesDto, UpdateEmployeeDto } from './dto';
import { EmployeeService } from './employee.service';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeeController {
  constructor(private readonly service: EmployeeService) {}

  @Get()
  list(@Query() query: ListEmployeesDto) {
    return this.service.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Auditable({ action: 'EMPLOYEE_CREATE', entity: 'Employee' })
  create(@Body() dto: CreateEmployeeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Auditable({ action: 'EMPLOYEE_UPDATE', entity: 'Employee' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEmployeeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'EMPLOYEE_DELETE', entity: 'Employee' })
  softDelete(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete(id);
  }
}
