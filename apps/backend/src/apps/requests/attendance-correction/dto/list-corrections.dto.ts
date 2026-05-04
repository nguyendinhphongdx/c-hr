import { RequestStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';

export class ListCorrectionsDto {
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  requesterId?: string;

  @IsOptional()
  @IsIn(['mine', 'incoming'])
  scope?: 'mine' | 'incoming';
}
