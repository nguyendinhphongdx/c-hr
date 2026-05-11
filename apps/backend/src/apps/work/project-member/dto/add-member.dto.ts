import { IsEnum, IsOptional, IsUUID } from 'class-validator';

import { ProjectRoleDto } from '../../project/dto/shared.dto';

export class AddMemberDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsEnum(ProjectRoleDto)
  role?: ProjectRoleDto;
}
