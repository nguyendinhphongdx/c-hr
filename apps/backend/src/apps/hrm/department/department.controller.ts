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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auditable } from '@/common/audit';
import { CurrentUser } from '@/common/decorators';
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';
import { RequestUser } from '@/common/types';

import { CreateDepartmentDto, UpdateDepartmentDto } from './dto';
import { DepartmentService } from './department.service';

@ApiTags('departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('departments')
export class DepartmentController {
  constructor(private readonly service: DepartmentService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.service.list(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  @Auditable({ action: 'DEPARTMENT_CREATE', entity: 'Department' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateDepartmentDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @Auditable({ action: 'DEPARTMENT_UPDATE', entity: 'Department' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'DEPARTMENT_DELETE', entity: 'Department' })
  softDelete(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete(user, id);
  }
}
