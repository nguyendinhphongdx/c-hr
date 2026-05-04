import { AppCode } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

export class GrantAppAdminDto {
  @IsUUID()
  userId: string;

  @IsEnum(AppCode)
  appCode: AppCode;
}
