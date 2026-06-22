import { IsEnum, IsOptional } from 'class-validator';
import { InvitationKind, InvitationStatus } from '@prisma/client';

export class ListInvitationsDto {
  @IsEnum(InvitationKind)
  @IsOptional()
  kind?: InvitationKind;

  @IsEnum(InvitationStatus)
  @IsOptional()
  status?: InvitationStatus;
}
