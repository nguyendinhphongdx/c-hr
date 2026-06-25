import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { PrismaService } from '@libs/database/prisma.service';

import type { EmployeeAttendanceCodeSetEvent } from './employee.events';
import { EmployeeService } from './employee.service';

@Injectable()
export class EmployeeListener {
  private readonly logger = new Logger(EmployeeListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeService: EmployeeService,
  ) {}

  @OnEvent('employee.attendanceCode.set', { async: true })
  async onAttendanceCodeSet(payload: EmployeeAttendanceCodeSetEvent): Promise<void> {
    try {
      const linked = await this.employeeService.linkPendingAttendance(
        this.prisma,
        payload.organizationId,
        payload.employeeId,
        payload.attendanceCode,
      );
      if (linked > 0) {
        this.logger.log(
          `[employee=${payload.employeeId}] linked ${linked} orphan attendance log(s) for code "${payload.attendanceCode}"`,
        );
      }
    } catch (e) {
      this.logger.error(
        `linkPendingAttendance failed for employee ${payload.employeeId}: ${(e as Error).message}`,
      );
    }
  }
}
