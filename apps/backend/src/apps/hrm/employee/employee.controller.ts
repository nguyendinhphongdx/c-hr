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
  Redirect,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';

import { Auditable } from '@/common/audit';
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';

import {
  BulkCreateEmployeesDto,
  CreateEmployeeDto,
  ListEmployeesDto,
  UpdateEmployeeDto,
  UpdateEmployeeRoleDto,
} from './dto';
import { EmployeeImportService } from './employee-import.service';
import { EmployeeService } from './employee.service';

const IMPORT_MAX_BYTES = 5 * 1024 * 1024;

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeeController {
  constructor(
    private readonly service: EmployeeService,
    private readonly importService: EmployeeImportService,
  ) {}

  @Get('import/template')
  @Redirect('/static/templates/employee-import.xlsx')
  importTemplate(@Query('type') type?: 'csv' | 'xlsx') {
    return {
      url:
        type === 'csv'
          ? '/static/templates/employee-import.csv'
          : '/static/templates/employee-import.xlsx',
    };
  }

  @Post('import/parse')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMPORT_MAX_BYTES } }))
  parseImport(@UploadedFile() file: Express.Multer.File) {
    return this.importService.parse(file);
  }

  @Post('import/bulk-create')
  @Auditable({ action: 'EMPLOYEE_IMPORT', entity: 'Employee' })
  bulkCreateImport(@Body() dto: BulkCreateEmployeesDto) {
    return this.importService.bulkCreate(dto);
  }

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

  @Patch(':id/role')
  @Auditable({ action: 'EMPLOYEE_ROLE_UPDATE', entity: 'Employee' })
  updateRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEmployeeRoleDto) {
    return this.service.updateRole(id, dto.role);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'EMPLOYEE_DELETE', entity: 'Employee' })
  softDelete(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete(id);
  }
}
