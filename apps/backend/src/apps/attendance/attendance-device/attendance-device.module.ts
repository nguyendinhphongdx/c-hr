import { Module } from '@nestjs/common';

import { AttendanceDeviceController } from './attendance-device.controller';
import { AttendanceDeviceRepository } from './attendance-device.repository';
import { AttendanceDeviceService } from './attendance-device.service';

@Module({
  controllers: [AttendanceDeviceController],
  providers: [AttendanceDeviceService, AttendanceDeviceRepository],
  exports: [AttendanceDeviceService, AttendanceDeviceRepository],
})
export class AttendanceDeviceModule {}
