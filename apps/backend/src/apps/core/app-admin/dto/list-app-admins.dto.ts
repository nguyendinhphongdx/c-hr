import { AppCode } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListAppAdminsDto {
  @IsOptional()
  @IsEnum(AppCode)
  app?: AppCode;
}
