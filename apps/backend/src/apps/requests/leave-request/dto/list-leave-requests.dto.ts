import { RequestStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';

export class ListLeaveRequestsDto {
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

  /// 'mine' = đơn của tôi, 'incoming' = đơn cần tôi duyệt.
  /// HRM appadmin có thể bỏ scope để xem hết Org.
  @IsOptional()
  @IsIn(['mine', 'incoming'])
  scope?: 'mine' | 'incoming';
}
