import { Module } from '@nestjs/common';

import { OrgChartController } from './orgchart.controller';
import { OrgChartService } from './orgchart.service';

@Module({
  controllers: [OrgChartController],
  providers: [OrgChartService],
  exports: [OrgChartService],
})
export class OrgChartModule {}
