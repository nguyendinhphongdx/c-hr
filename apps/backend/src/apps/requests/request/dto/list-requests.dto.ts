import { RequestStatus } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';

export class ListRequestsDto {
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsUUID()
  requesterId?: string;

  /// 'mine' = đơn của tôi, 'incoming' = đơn cần tôi duyệt.
  /// HRM appadmin có thể bỏ scope để xem hết Org.
  @IsOptional()
  @IsIn(['mine', 'incoming'])
  scope?: 'mine' | 'incoming';
}
